use rocket::{State, serde::json::Json, post, get, http::{Cookie, CookieJar, SameSite}};
use rocket::time::{OffsetDateTime, Duration};
use tracing::{info, warn, error};

use crate::models::{
    response::ApiResponse,
    auth::{LoginRequest, LoginResponse, UserInfo},
    route_command::RouteCommand,
};
use crate::database::{
    DbPool,
    auth::{authenticate_user, create_user_session, log_login_attempt},
};
use crate::auth::{AuthenticatedUser, OptionalUser, RequestInfo};
use crate::cache::{RedisPool, user::UserCache, session::SessionCache};
use crate::use_cases::auth_use_case::AuthUseCase;

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    cookies: &CookieJar<'_>,
    login_req: Json<LoginRequest>,
    request_info: RequestInfo,
) -> Json<ApiResponse<LoginResponse>> {
    let ip_address = request_info.ip_address.unwrap_or_else(|| "127.0.0.1".parse().unwrap());
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

    // 使用用例层处理登录逻辑
    let auth_use_case = AuthUseCase::new(pool.inner().clone());
    let route_command = match auth_use_case.handle_login(login_req.into_inner()).await {
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
    if let RouteCommand::Sequence { commands } = &route_command {
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
    cookies: &CookieJar<'_>,
    auth_user: AuthenticatedUser,
) -> Json<ApiResponse<()>> {
    info!("User logout: {}", auth_user.user.username);
    
    let auth_use_case = AuthUseCase::new(pool.inner().clone());
    let route_command = match auth_use_case.handle_logout(&auth_user.session.session_token).await {
        Ok(command) => command,
        Err(e) => {
            warn!("Logout use case failed: {}", e);
            // 即使后端处理失败，也要清理前端状态
            RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::json!(null)),
                RouteCommand::redirect_to("/login"),
            ])
        }
    };
    
    // 清理session缓存和cookie
    let session_cache = SessionCache::new(redis.inner().clone());
    let _ = session_cache.invalidate_session(&auth_user.session.session_token).await;
    cookies.remove_private(Cookie::build(("session_token", "")));
    
    Json(ApiResponse::command_only(route_command))
}

#[get("/api/auth/current")]
pub async fn get_current_user(
    pool: &State<DbPool>,
    auth_user: AuthenticatedUser
) -> Json<ApiResponse<UserInfo>> {
    let auth_use_case = AuthUseCase::new(pool.inner().clone());
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

#[get("/api/auth/status")]
pub async fn auth_status(optional_user: OptionalUser) -> Json<ApiResponse<Option<UserInfo>>> {
    match optional_user.0 {
        Some(auth_user) => {
            let user_info = UserInfo::from(auth_user.user);
            Json(ApiResponse::success(Some(user_info)))
        }
        None => Json(ApiResponse::success(None)),
    }
}

#[get("/api/auth/check")]
pub async fn check_auth() -> Json<ApiResponse<bool>> {
    Json(ApiResponse::success(true))
}