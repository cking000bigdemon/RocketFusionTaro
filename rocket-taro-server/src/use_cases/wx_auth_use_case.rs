use std::sync::Arc;
use tracing::{info, warn, error};

use crate::models::{
    route_command::RouteCommand,
    wx_auth::{WxLoginRequest, WxLoginResponse},
    auth::UserInfo,
};
use crate::database::{
    DbPool,
    wx_auth::{code2session, find_user_by_openid, create_wx_user, update_wx_user_session},
    auth::create_user_session,
};
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
        let wx_user = match self.find_or_create_wx_user(
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

        // 3. 创建系统会话
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

        // 4. 生成路由指令
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
}