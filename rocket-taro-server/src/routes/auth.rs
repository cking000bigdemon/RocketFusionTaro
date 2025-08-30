use rocket::{State, serde::json::Json, post, get, http::{Cookie, CookieJar, SameSite}};
use rocket::time::{OffsetDateTime, Duration};
use tracing::{info, warn, error};

use crate::models::{
    response::ApiResponse,
    auth::{LoginRequest, RegisterRequest, LoginResponse, UserInfo},
    wx_auth::{WxLoginRequest, WxLoginResponse},
    route_command::RouteCommand,
};
use crate::database::{
    DbPool,
    auth::{authenticate_user, create_user_session, log_login_attempt},
};
use crate::auth::{AuthenticatedUser, OptionalUser, RequestInfo};
use crate::cache::{RedisPool, user::UserCache, session::SessionCache};
use crate::use_cases::{auth_use_case::AuthUseCase, wx_auth_use_case::WxAuthUseCase};
use crate::config::{RouteConfig, Platform};

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    route_config: &State<RouteConfig>,
    cookies: &CookieJar<'_>,
    login_req: Json<LoginRequest>,
    request_info: RequestInfo,
) -> Json<ApiResponse<LoginResponse>> {
    let ip_address = request_info.ip_address.unwrap_or_else(|| "0.0.0.0".parse().unwrap());
    let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
    
    let user_cache = UserCache::new(redis.inner().clone());
    let session_cache = SessionCache::new(redis.inner().clone());
    
    // 检查账户是否被锁定
    if let Ok(is_locked) = user_cache.is_account_locked(&login_req.username, 5).await {
        if is_locked {
            warn!("Account locked due to too many failed attempts: {}", login_req.username);
            return Json(ApiResponse::error_with_command(
                "账户已被锁定，请稍后再试",
                RouteCommand::alert("账户锁定", "由于多次登录失败，您的账户已被临时锁定，请稍后再试")
            ));
        }
    }

    // 保存登录请求的副本用于后续处理
    let login_req_copy = LoginRequest {
        username: login_req.username.clone(),
        password: login_req.password.clone(),
    };

    // 从 User-Agent 检测平台
    let platform = Platform::from_user_agent(&user_agent);
    
    // 使用用例层处理登录逻辑
    let auth_use_case = AuthUseCase::new(pool.inner().clone(), route_config.inner().clone());
    let route_command = match auth_use_case.handle_login(login_req.into_inner(), platform).await {
        Ok(command) => command,
        Err(e) => {
            error!("Login use case failed: {}", e);
            // 记录登录失败
            let _ = user_cache.record_login_failure(&login_req_copy.username).await;
            let _ = log_login_attempt(
                pool,
                None,
                &login_req_copy.username,
                false,
                Some(ip_address),
                Some(user_agent.clone()),
                Some("用例处理失败".to_string()),
            ).await;
            
            RouteCommand::alert("登录失败", "登录过程中发生错误，请稍后重试")
        }
    };

    // 如果是成功的登录，需要处理会话和缓存逻辑
    // 这里保持向后兼容性，仍然创建会话token和设置cookie
    if let RouteCommand::Sequence { commands, .. } = &route_command {
        // 检查是否包含用户数据处理命令，说明登录成功
        if commands.iter().any(|cmd| matches!(cmd, RouteCommand::ProcessData { data_type, .. } if data_type == "user")) {
            // 重新验证用户以获取完整用户信息（用于向后兼容）
            if let Ok(Some(user)) = authenticate_user(pool, &login_req_copy).await {
                // 创建会话
                if let Ok(session) = create_user_session(pool, user.id, Some(user_agent.clone()), Some(ip_address)).await {
                    // 设置会话Cookie
                    let mut cookie = Cookie::new("session_token", session.session_token.clone());
                    cookie.set_same_site(SameSite::Lax);
                    cookie.set_http_only(true);
                    cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                    cookie.set_path("/");
                    cookies.add_private(cookie);

                    // 缓存用户信息和会话
                    let _ = user_cache.cache_user(&user).await;
                    let _ = user_cache.cache_username_mapping(&user.username, user.id).await;
                    let _ = session_cache.cache_user_session(&user, &session).await;
                    let _ = user_cache.clear_login_failures(&login_req_copy.username).await;

                    // 记录成功登录日志
                    let _ = log_login_attempt(
                        pool,
                        Some(user.id),
                        &login_req_copy.username,
                        true,
                        Some(ip_address),
                        Some(user_agent),
                        None,
                    ).await;

                    // 返回传统的登录响应数据以保持兼容性
                    let response = LoginResponse {
                        user: UserInfo::from(user),
                        session_token: session.session_token,
                        expires_at: session.expires_at,
                    };

                    return Json(ApiResponse::success_with_command(response, route_command));
                }
            }
        }
    }

    // 如果不是成功登录，记录失败尝试
    if !matches!(route_command, RouteCommand::Sequence { .. }) {
        let _ = user_cache.record_login_failure(&login_req_copy.username).await;
        let _ = log_login_attempt(
            pool,
            None,
            &login_req_copy.username,
            false,
            Some(ip_address),
            Some(user_agent.clone()),
            Some("认证失败".to_string()),
        ).await;
    }

    // 如果不是成功登录，或者处理过程中出错，只返回路由指令
    Json(ApiResponse::command_only(route_command))
}

#[post("/api/auth/logout")]
pub async fn logout(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    route_config: &State<RouteConfig>,
    cookies: &CookieJar<'_>,
    auth_user: AuthenticatedUser,
    request_info: RequestInfo,
) -> Json<ApiResponse<()>> {
    info!("User logout: {}", auth_user.user.username);
    
    let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
    let platform = Platform::from_user_agent(&user_agent);
    
    let auth_use_case = AuthUseCase::new(pool.inner().clone(), route_config.inner().clone());
    let route_command = match auth_use_case.handle_logout(&auth_user.session.session_token, platform).await {
        Ok(command) => command,
        Err(e) => {
            warn!("Logout use case failed: {}", e);
            // 即使后端处理失败，也要清理前端状态
            let login_route = route_config.get_route("auth.login", platform)
                .unwrap_or_else(|| "/pages/login/login".to_string());
            RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::json!(null)),
                RouteCommand::redirect_to(&login_route),
            ])
        }
    };
    
    // 清理session缓存和cookie
    let session_cache = SessionCache::new(redis.inner().clone());
    let _ = session_cache.invalidate_session(&auth_user.session.session_token).await;
    cookies.remove_private(Cookie::build(("session_token", "")));
    
    Json(ApiResponse::command_only(route_command))
}

#[post("/api/auth/register", data = "<register_req>")]
pub async fn register(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    route_config: &State<RouteConfig>,
    cookies: &CookieJar<'_>,
    register_req: Json<RegisterRequest>,
    request_info: RequestInfo,
) -> Json<ApiResponse<LoginResponse>> {
    let ip_address = request_info.ip_address.unwrap_or_else(|| "0.0.0.0".parse().unwrap());
    let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
    
    info!("User registration request: {}", register_req.username);
    
    let platform = Platform::from_user_agent(&user_agent);
    let register_data = register_req.into_inner();
    let auth_use_case = AuthUseCase::new(pool.inner().clone(), route_config.inner().clone());
    let route_command = match auth_use_case.handle_register(register_data.clone(), platform).await {
        Ok(command) => command,
        Err(e) => {
            error!("Registration use case failed: {}", e);
            RouteCommand::alert("注册失败", "注册过程中发生错误，请稍后重试")
        }
    };

    // 如果注册成功并包含用户数据处理指令，说明是自动登录成功
    if let RouteCommand::Sequence { commands, .. } = &route_command {
        if let Some(RouteCommand::ProcessData { data, .. }) = commands.first() {
            if let Ok(user_info) = serde_json::from_value::<UserInfo>(data.clone()) {
                
                // 通过用户名重新获取完整用户信息  
                let login_for_session = LoginRequest {
                    username: user_info.username.clone(),
                    password: register_data.password.clone(),
                };
                if let Ok(Some(user)) = authenticate_user(pool, &login_for_session).await {
                    // 创建会话
                    if let Ok(session) = create_user_session(pool, user.id, Some(user_agent.clone()), Some(ip_address)).await {
                        // 设置会话Cookie
                        let mut cookie = Cookie::new("session_token", session.session_token.clone());
                        cookie.set_same_site(SameSite::Lax);
                        cookie.set_http_only(true);
                        cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                        cookie.set_path("/");
                        cookies.add_private(cookie);

                        // 缓存用户信息
                        let user_cache = UserCache::new(redis.inner().clone());
                        let session_cache = SessionCache::new(redis.inner().clone());
                        let _ = user_cache.cache_user(&user).await;
                        let _ = user_cache.cache_username_mapping(&user.username, user.id).await;
                        let _ = session_cache.cache_user_session(&user, &session).await;

                        // 返回完整的注册响应
                        let response = LoginResponse {
                            user: UserInfo::from(user),
                            session_token: session.session_token,
                            expires_at: session.expires_at,
                        };

                        return Json(ApiResponse::success_with_command(response, route_command));
                    }
                }
            }
        }
    }

    // 如果不是成功注册，只返回路由指令
    Json(ApiResponse::command_only(route_command))
}

#[get("/api/auth/current")]
pub async fn get_current_user(
    pool: &State<DbPool>,
    route_config: &State<RouteConfig>,
    auth_user: AuthenticatedUser
) -> Json<ApiResponse<UserInfo>> {
    let auth_use_case = AuthUseCase::new(pool.inner().clone(), route_config.inner().clone());
    let route_command = match auth_use_case.get_current_user(auth_user.user).await {
        Ok(command) => command,
        Err(e) => {
            error!("Get current user failed: {}", e);
            RouteCommand::alert("获取用户信息失败", "无法获取当前用户信息")
        }
    };
    
    // 对于获取当前用户，我们保持传统的响应格式
    match route_command {
        RouteCommand::ProcessData { data, .. } => {
            if let Ok(user_info) = serde_json::from_value::<UserInfo>(data) {
                Json(ApiResponse::success(user_info))
            } else {
                Json(ApiResponse::error("用户信息格式错误"))
            }
        }
        _ => Json(ApiResponse::error("获取用户信息失败"))
    }
}

#[post("/api/auth/guest-login")]
pub async fn guest_login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    route_config: &State<RouteConfig>,
    cookies: &CookieJar<'_>,
    request_info: RequestInfo,
) -> Json<ApiResponse<LoginResponse>> {
    let ip_address = request_info.ip_address.unwrap_or_else(|| "0.0.0.0".parse().unwrap());
    let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
    
    info!("Guest login request from IP: {}", ip_address);
    
    let platform = Platform::from_user_agent(&user_agent);
    let auth_use_case = AuthUseCase::new(pool.inner().clone(), route_config.inner().clone());
    
    let route_command = match auth_use_case.handle_guest_login(platform).await {
        Ok(command) => command,
        Err(e) => {
            error!("Guest login use case failed: {}", e);
            RouteCommand::alert("游客登录失败", "游客登录过程中发生错误，请稍后重试")
        }
    };

    // 如果是成功的游客登录，创建会话token和设置cookie
    if let RouteCommand::Sequence { commands, .. } = &route_command {
        if let Some(RouteCommand::ProcessData { data, .. }) = commands.first() {
            if let Ok(user_info) = serde_json::from_value::<UserInfo>(data.clone()) {
                // 由于游客用户无密码，我们直接通过用户名查找用户
                if let Ok(Some(user)) = crate::database::auth::authenticate_guest_user(pool, &user_info.username).await {
                    if let Ok(session) = create_user_session(pool, user.id, Some(user_agent.clone()), Some(ip_address)).await {
                        // 设置会话Cookie
                        let mut cookie = Cookie::new("session_token", session.session_token.clone());
                        cookie.set_same_site(SameSite::Lax);
                        cookie.set_http_only(true);
                        cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                        cookie.set_path("/");
                        cookies.add_private(cookie);

                        // 缓存游客用户信息
                        let user_cache = UserCache::new(redis.inner().clone());
                        let session_cache = SessionCache::new(redis.inner().clone());
                        let _ = user_cache.cache_user(&user).await;
                        let _ = user_cache.cache_username_mapping(&user.username, user.id).await;
                        let _ = session_cache.cache_user_session(&user, &session).await;

                        // 记录游客登录日志
                        let _ = log_login_attempt(
                            pool,
                            Some(user.id),
                            &user.username,
                            true,
                            Some(ip_address),
                            Some(user_agent),
                            Some("游客登录".to_string()),
                        ).await;

                        let response = LoginResponse {
                            user: UserInfo::from(user),
                            session_token: session.session_token,
                            expires_at: session.expires_at,
                        };

                        return Json(ApiResponse::success_with_command(response, route_command));
                    }
                }
            }
        }
    }

    Json(ApiResponse::command_only(route_command))
}

#[get("/api/auth/status")]
pub async fn auth_status(
    route_config: &State<RouteConfig>,
    optional_user: OptionalUser,
    request_info: RequestInfo
) -> Json<ApiResponse<Option<UserInfo>>> {
    match optional_user.0 {
        Some(auth_user) => {
            let user_info = UserInfo::from(auth_user.user);
            Json(ApiResponse::success(Some(user_info)))
        }
        None => {
            // 未登录用户，返回跳转登录页的路由指令
            let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
            let platform = Platform::from_user_agent(&user_agent);
            let login_route = route_config.get_route("auth.login", platform)
                .unwrap_or_else(|| "/pages/login/login".to_string());
            let route_command = RouteCommand::navigate_to(&login_route);
            Json(ApiResponse::error_with_command("未登录", route_command))
        },
    }
}

#[post("/api/auth/wx-login", data = "<wx_login_req>")]
pub async fn wx_login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    route_config: &State<RouteConfig>,
    cookies: &CookieJar<'_>,
    wx_login_req: Json<WxLoginRequest>,
    request_info: RequestInfo,
) -> Json<ApiResponse<WxLoginResponse>> {
    let user_agent = request_info.user_agent.unwrap_or_else(|| "WeChat Mini Program".to_string());
    let ip_address = request_info.ip_address.unwrap_or_else(|| "0.0.0.0".parse().unwrap());
    
    info!("收到微信登录请求");
    
    // 从User-Agent检测平台
    let platform = Platform::from_user_agent(&user_agent);
    
    // 使用微信登录用例处理业务逻辑
    let wx_auth_use_case = WxAuthUseCase::new(pool.inner().clone(), std::sync::Arc::new(route_config.inner().clone()));
    let route_command = match wx_auth_use_case.handle_wx_login(wx_login_req.into_inner(), platform).await {
        Ok(command) => command,
        Err(e) => {
            error!("微信登录用例处理失败: {}", e);
            RouteCommand::alert("登录失败", "微信登录过程中发生错误，请稍后重试")
        }
    };

    // 如果是成功的登录，需要设置Cookie（向后兼容）
    if let RouteCommand::Sequence { commands, .. } = &route_command {
        if let Some(RouteCommand::ProcessData { data_type, data, .. }) = commands.first() {
            if data_type == "user" {
                if let Ok(wx_response) = serde_json::from_value::<WxLoginResponse>(data.clone()) {
                    // 设置会话Cookie
                    let mut cookie = Cookie::new("session_token", wx_response.session_token.clone());
                    cookie.set_same_site(SameSite::Lax);
                    cookie.set_http_only(true);
                    cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                    cookie.set_path("/");
                    cookies.add_private(cookie);

                    // 缓存用户信息
                    let user_cache = UserCache::new(redis.inner().clone());
                    let session_cache = SessionCache::new(redis.inner().clone());
                    
                    // 注意：这里需要构建完整的User对象用于缓存
                    // 由于我们已经有了UserInfo，但缓存需要完整的User，这里先跳过缓存
                    // 在生产环境中，应该重新查询完整的用户信息进行缓存
                    
                    info!("微信用户登录成功，已设置会话");
                }
            }
        }
    }

    // 构建响应（注意：实际数据会通过RouteCommand传递）
    let default_response = WxLoginResponse {
        user: UserInfo {
            id: uuid::Uuid::new_v4(),
            username: "wx_user".to_string(),
            email: "temp@wx.temp".to_string(),
            full_name: None,
            avatar_url: None,
            is_admin: false,
            is_guest: true,
            wx_openid: None,
            has_wx_session: false,
            display_name: "wx_user".to_string(),
        },
        session_token: "".to_string(),
        expires_at: chrono::Utc::now(),
    };

    Json(ApiResponse::success_with_command(default_response, route_command))
}

#[derive(serde::Deserialize, Debug)]
pub struct UpdateProfileRequest {
    pub encrypted_data: Option<String>,
    pub iv: Option<String>,
    pub signature: Option<String>,
    pub raw_data: Option<String>,
}

#[post("/api/auth/update-profile", data = "<profile_req>")]
pub async fn update_user_profile(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    profile_req: Json<UpdateProfileRequest>,
    auth_user: AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    info!("收到用户信息更新请求: {}", auth_user.user.username);
    
    // 检查是否为微信用户（需要有有效的wx_session_key）
    if auth_user.user.wx_session_key.is_none() {
        return Json(ApiResponse::error("当前用户不是微信用户或会话已过期，请使用微信重新登录"));
    }
    
    // wx_session_key只在服务端使用，不能返回给客户端
    let session_key = auth_user.user.wx_session_key.as_ref().unwrap();
    
    // 处理用户资料更新
    match process_user_profile_update(pool, &auth_user.user, &profile_req, session_key).await {
        Ok(updated_user_info) => {
            info!("用户信息更新成功: {}", auth_user.user.username);
            
            // 更新缓存 - 清除用户缓存和会话缓存
            let user_cache = UserCache::new(redis.inner().clone());
            let session_cache = SessionCache::new(redis.inner().clone());
            let _ = user_cache.invalidate_user(auth_user.user.id).await;
            let _ = session_cache.invalidate_user_sessions(auth_user.user.id).await;
            
            Json(ApiResponse::success(updated_user_info))
        },
        Err(e) => {
            error!("用户信息更新失败: {}", e);
            Json(ApiResponse::error("用户信息更新失败"))
        }
    }
}

// 辅助函数：处理用户资料更新
async fn process_user_profile_update(
    pool: &DbPool,
    user: &crate::models::auth::User,
    profile_req: &UpdateProfileRequest,
    session_key: &str,
) -> Result<UserInfo, String> {
    use crate::utils::wx_crypto::WxCrypto;
    use crate::database::wx_auth::update_wx_user_profile;
    
    // 验证必要的数据
    let encrypted_data = profile_req.encrypted_data.as_ref().ok_or("缺少加密数据")?;
    let iv = profile_req.iv.as_ref().ok_or("缺少初始向量")?;
    let signature = profile_req.signature.as_ref().ok_or("缺少签名")?;
    let raw_data = profile_req.raw_data.as_ref().ok_or("缺少原始数据")?;
    
    // 1. 验证数据签名
    if !WxCrypto::verify_signature(raw_data, session_key, signature)? {
        return Err("数据签名验证失败".to_string());
    }
    
    // 2. 解密用户Profile数据（使用专门的方法处理wx.getUserProfile数据）
    let profile_info = WxCrypto::decrypt_user_profile(encrypted_data, session_key, iv)?;
    
    // 3. 更新用户信息到数据库（只更新昵称和头像）
    update_wx_user_profile(
        pool,
        user.id,
        &profile_info.nick_name,
        &profile_info.avatar_url,
    ).await.map_err(|e| format!("更新数据库失败: {}", e))?;
    
    // 4. 返回更新后的用户信息
    let display_name = profile_info.nick_name.clone();
    Ok(UserInfo {
        id: user.id,
        username: user.username.clone(),
        email: user.email.clone(),
        full_name: Some(profile_info.nick_name),
        avatar_url: Some(profile_info.avatar_url),
        is_admin: user.is_admin,
        is_guest: user.is_guest,
        wx_openid: user.wx_openid.clone(),
        has_wx_session: user.wx_session_key.is_some(),
        display_name,
    })
}

