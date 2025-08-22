use rocket::{State, serde::json::Json, post, get, http::{Status, Cookie, CookieJar, SameSite}};
use rocket::time::{OffsetDateTime, Duration};
use tracing::{info, warn, error, debug};

use crate::models::{
    response::ApiResponse,
    auth::{LoginRequest, LoginResponse, UserInfo},
};
use crate::database::{
    DbPool,
    auth::{authenticate_user, create_user_session, update_last_login, logout_session, log_login_attempt},
};
use crate::auth::{AuthenticatedUser, OptionalUser, RequestInfo};
use crate::cache::{RedisPool, user::UserCache, session::SessionCache};


#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    cookies: &CookieJar<'_>,
    login_req: Json<LoginRequest>,
    request_info: RequestInfo,
) -> Result<Json<ApiResponse<LoginResponse>>, Status> {
    let ip_address = request_info.ip_address.unwrap_or_else(|| "127.0.0.1".parse().unwrap());
    let user_agent = request_info.user_agent.unwrap_or_else(|| "unknown".to_string());
    
    let user_cache = UserCache::new(redis.inner().clone());
    let session_cache = SessionCache::new(redis.inner().clone());
    
    // 检查账户是否被锁定
    if let Ok(is_locked) = user_cache.is_account_locked(&login_req.username, 5).await {
        if is_locked {
            warn!("Account locked due to too many failed attempts: {}", login_req.username);
            return Ok(Json(ApiResponse::error("账户已被锁定，请稍后再试")));
        }
    }
    
    match authenticate_user(pool, &login_req).await {
        Ok(Some(user)) => {
            info!("Starting user session creation for user: {}", user.username);
            // 创建用户会话
            match create_user_session(pool, user.id, Some(user_agent.clone()), Some(ip_address)).await {
                Ok(session) => {
                    info!("User session created successfully for user: {}", user.username);
                    // 更新最后登录时间
                    if let Err(e) = update_last_login(pool, user.id).await {
                        warn!("Failed to update last login time: {}", e);
                    }
                    
                    // 缓存用户信息和会话
                    if let Err(e) = user_cache.cache_user(&user).await {
                        debug!("Failed to cache user info: {}", e);
                    }
                    if let Err(e) = user_cache.cache_username_mapping(&user.username, user.id).await {
                        debug!("Failed to cache username mapping: {}", e);
                    }
                    if let Err(e) = session_cache.cache_user_session(&user, &session).await {
                        debug!("Failed to cache user session: {}", e);
                    }
                    
                    // 清除登录失败记录
                    if let Err(e) = user_cache.clear_login_failures(&login_req.username).await {
                        debug!("Failed to clear login failures: {}", e);
                    }
                    
                    // 记录成功登录日志
                    if let Err(e) = log_login_attempt(
                        pool,
                        Some(user.id),
                        &login_req.username,
                        true,
                        Some(ip_address),
                        Some(user_agent),
                        None,
                    ).await {
                        warn!("Failed to log login attempt: {}", e);
                    }
                    
                    // 设置会话Cookie
                    let mut cookie = Cookie::new("session_token", session.session_token.clone());
                    cookie.set_same_site(SameSite::Lax);
                    cookie.set_http_only(true);
                    // 设置过期时间为8小时后
                    cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                    cookie.set_path("/");
                    cookies.add_private(cookie);
                    
                    let response = LoginResponse {
                        user: UserInfo::from(user.clone()),
                        session_token: session.session_token,
                        expires_at: session.expires_at,
                    };
                    info!("Login successful for user: {}", user.username);
                    
                    Ok(Json(ApiResponse::success(response)))
                }
                Err(e) => {
                    error!("Failed to create session for user {}: {}", user.username, e);
                    // 记录失败日志
                    if let Err(log_err) = log_login_attempt(
                        pool,
                        Some(user.id),
                        &login_req.username,
                        false,
                        Some(ip_address),
                        Some(user_agent),
                        Some("会话创建失败".to_string()),
                    ).await {
                        warn!("Failed to log login attempt: {}", log_err);
                    }
                    
                    Err(Status::InternalServerError)
                }
            }
        }
        Ok(None) => {
            warn!("Login failed for username: {} - invalid credentials", login_req.username);
            
            // 记录登录失败
            if let Err(e) = user_cache.record_login_failure(&login_req.username).await {
                debug!("Failed to record login failure: {}", e);
            }
            
            // 记录失败登录日志
            if let Err(e) = log_login_attempt(
                pool,
                None,
                &login_req.username,
                false,
                Some(ip_address),
                Some(user_agent),
                Some("用户名或密码错误".to_string()),
            ).await {
                warn!("Failed to log login attempt: {}", e);
            }
            
            Ok(Json(ApiResponse::error("用户名或密码错误")))
        }
        Err(e) => {
            error!("Authentication error for username {}: {}", login_req.username, e);
            Err(Status::InternalServerError)
        }
    }
}


#[post("/api/auth/logout")]
pub async fn logout(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    cookies: &CookieJar<'_>,
    auth_user: AuthenticatedUser,
) -> Json<ApiResponse<()>> {
    info!("User logout: {}", auth_user.user.username);
    let session_cache = SessionCache::new(redis.inner().clone());
    
    // 删除缓存中的会话
    if let Err(e) = session_cache.invalidate_session(&auth_user.session.session_token).await {
        debug!("Failed to invalidate session cache: {}", e);
    }
    
    // 删除数据库中的会话
    if let Err(e) = logout_session(pool, &auth_user.session.session_token).await {
        warn!("Failed to logout session: {}", e);
    }
    
    // 删除Cookie
    cookies.remove_private(Cookie::build(("session_token", "")));
    
    Json(ApiResponse::success(()))
}

#[get("/api/auth/current")]
pub async fn get_current_user(auth_user: AuthenticatedUser) -> Json<ApiResponse<UserInfo>> {
    let user_info = UserInfo::from(auth_user.user);
    Json(ApiResponse::success(user_info))
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