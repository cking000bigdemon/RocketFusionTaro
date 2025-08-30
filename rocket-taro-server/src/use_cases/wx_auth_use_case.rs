use std::sync::Arc;
use tracing::{info, warn, error};

use crate::models::{
    route_command::RouteCommand,
    wx_auth::{WxLoginRequest, WxLoginResponse},
    auth::UserInfo,
};
use crate::database::{
    DbPool,
    wx_auth::{code2session, find_user_by_openid, create_wx_user, update_wx_user_session, update_wx_user_profile},
    auth::create_user_session,
};
use crate::utils::wx_crypto::WxCrypto;
use crate::config::{RouteConfig, Platform};

pub struct WxAuthUseCase {
    db_pool: DbPool,
    route_config: Arc<RouteConfig>,
}

impl WxAuthUseCase {
    pub fn new(db_pool: DbPool, route_config: Arc<RouteConfig>) -> Self {
        Self {
            db_pool,
            route_config,
        }
    }

    pub async fn handle_wx_login(
        &self,
        wx_login_req: WxLoginRequest,
        platform: Platform,
    ) -> Result<RouteCommand, String> {
        info!("处理微信登录请求, platform: {:?}", platform);

        // 1. 调用微信API换取openid
        let wx_response = match self.call_wx_code2session(&wx_login_req.code).await {
            Ok(response) => response,
            Err(e) => {
                error!("微信API调用失败: {}", e);
                return Ok(RouteCommand::alert("登录失败", "微信授权失败，请重试"));
            }
        };

        // 2. 查找或创建用户
        let mut wx_user = match self.find_or_create_wx_user(
            &wx_response.openid,
            wx_response.unionid.as_deref(),
            &wx_response.session_key,
        ).await {
            Ok(user) => user,
            Err(e) => {
                error!("用户处理失败: {}", e);
                return Ok(RouteCommand::alert("登录失败", "用户信息处理失败"));
            }
        };

        // 3. 如果提供了用户信息的加密数据，进行解密和验证
        if let (Some(encrypted_data), Some(iv), Some(signature), Some(raw_data)) = (
            &wx_login_req.encrypted_data,
            &wx_login_req.iv,
            &wx_login_req.signature,
            &wx_login_req.raw_data,
        ) {
            info!("开始处理微信用户信息解密");
            
            match self.process_encrypted_user_info(
                &mut wx_user,
                encrypted_data,
                iv,
                signature,
                raw_data,
                &wx_response.session_key,
            ).await {
                Ok(_) => {
                    info!("用户信息更新成功");
                },
                Err(e) => {
                    // 解密失败不应该影响登录流程，只记录警告
                    warn!("用户信息解密失败，但不影响登录: {}", e);
                }
            }
        } else {
            info!("未提供用户信息加密数据，跳过用户信息更新");
        }

        // 4. 创建系统会话
        let session = match create_user_session(
            &self.db_pool,
            wx_user.id,
            Some("WeChat Mini Program".to_string()),
            None,
        ).await {
            Ok(session) => session,
            Err(e) => {
                error!("创建会话失败: {}", e);
                return Ok(RouteCommand::alert("登录失败", "会话创建失败"));
            }
        };

        info!("微信用户登录成功: {}", wx_user.username);

        // 5. 生成路由指令
        // 构建用户信息
        let regular_user: crate::models::auth::User = wx_user.clone().into();
        let user_info = UserInfo::from(regular_user);
        
        // 构建响应数据
        let wx_login_response = WxLoginResponse {
            user: user_info,
            session_token: session.session_token,
            expires_at: session.expires_at,
        };

        // 生成包含用户数据和导航的复合指令
        let user_data_command = RouteCommand::ProcessData {
            data_type: "user".to_string(),
            data: serde_json::to_value(&wx_login_response).unwrap(),
            merge: Some(false),
        };

        // 获取主页路由
        let home_route = self.route_config.get_route("home.main", platform)
            .unwrap_or_else(|| "/pages/home/home".to_string());
        let navigate_command = RouteCommand::NavigateTo {
            path: home_route,
            params: None,
            replace: Some(true),
            fallback_path: Some("/pages/home/home".to_string()),
        };

        Ok(RouteCommand::Sequence {
            commands: vec![user_data_command, navigate_command],
            stop_on_error: Some(true),
        })
    }

    async fn call_wx_code2session(&self, code: &str) -> Result<crate::models::wx_auth::Code2SessionResponse, String> {
        // 从配置读取微信小程序信息
        let app_id = "wx2078fa60851884ca";
        let app_secret = "b6727ca843ad05db752c1349ebcad8c9";
        
        code2session(app_id, app_secret, code).await
    }

    async fn find_or_create_wx_user(
        &self,
        openid: &str,
        unionid: Option<&str>,
        session_key: &str,
    ) -> Result<crate::models::wx_auth::WxUser, String> {
        // 先查找现有用户
        match find_user_by_openid(&self.db_pool, openid).await {
            Ok(Some(mut user)) => {
                // 更新session_key
                if let Err(e) = update_wx_user_session(&self.db_pool, user.id, session_key).await {
                    warn!("更新用户session失败: {}", e);
                }
                user.wx_session_key = Some(session_key.to_string());
                Ok(user)
            },
            Ok(None) => {
                // 创建新用户
                create_wx_user(&self.db_pool, openid, unionid, session_key)
                    .await
                    .map_err(|e| format!("创建微信用户失败: {}", e))
            },
            Err(e) => {
                Err(format!("查找用户失败: {}", e))
            }
        }
    }

    async fn process_encrypted_user_info(
        &self,
        wx_user: &mut crate::models::wx_auth::WxUser,
        encrypted_data: &str,
        iv: &str,
        signature: &str,
        raw_data: &str,
        session_key: &str,
    ) -> Result<(), String> {
        info!("开始处理加密的用户信息");

        // 1. 验证数据签名
        if !WxCrypto::verify_signature(raw_data, session_key, signature)? {
            return Err("数据签名验证失败".to_string());
        }

        // 2. 解密用户数据
        let decrypted_user_info = WxCrypto::decrypt_user_info(encrypted_data, session_key, iv)?;

        // 3. 验证水印
        let app_id = "wx2078fa60851884ca"; // 应该从配置读取
        if !WxCrypto::verify_watermark(&decrypted_user_info, app_id)? {
            warn!("水印验证失败，但继续处理用户信息");
        }

        // 4. 更新用户信息到数据库
        if let Err(e) = update_wx_user_profile(
            &self.db_pool,
            wx_user.id,
            &decrypted_user_info.nick_name,
            &decrypted_user_info.avatar_url,
        ).await {
            error!("更新用户信息到数据库失败: {}", e);
            return Err(format!("更新用户信息失败: {}", e));
        }

        // 5. 更新内存中的用户对象
        wx_user.full_name = Some(decrypted_user_info.nick_name);
        wx_user.avatar_url = Some(decrypted_user_info.avatar_url);

        info!("用户信息处理完成");
        Ok(())
    }
}