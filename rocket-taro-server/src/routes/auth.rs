use rocket::{State, serde::json::Json, post, get, http::{Status, Cookie, CookieJar, SameSite}, Request};
use rocket::time::{OffsetDateTime, Duration};
use std::net::IpAddr;

use crate::models::{
    response::ApiResponse,
    auth::{LoginRequest, LoginResponse, UserInfo},
};
use crate::database::{
    DbPool,
    auth::{authenticate_user, create_user_session, update_last_login, logout_session, log_login_attempt},
};
use crate::auth::{AuthenticatedUser, OptionalUser};

// 获取客户端IP地址的辅助函数
fn get_client_ip(request: &Request) -> Option<IpAddr> {
    // 尝试从 X-Real-IP 头获取
    if let Some(ip_str) = request.headers().get_one("X-Real-IP") {
        if let Ok(ip) = ip_str.parse() {
            return Some(ip);
        }
    }
    
    // 尝试从 X-Forwarded-For 头获取
    if let Some(forwarded) = request.headers().get_one("X-Forwarded-For") {
        if let Some(ip_str) = forwarded.split(',').next() {
            if let Ok(ip) = ip_str.trim().parse() {
                return Some(ip);
            }
        }
    }
    
    // 使用远程地址
    request.client_ip()
}

// 获取User-Agent
fn get_user_agent(request: &Request) -> Option<String> {
    request.headers().get_one("User-Agent").map(|s| s.to_string())
}

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    cookies: &CookieJar<'_>,
    login_req: Json<LoginRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>, Status> {
    let ip_address = "127.0.0.1".parse::<IpAddr>().unwrap();
    let user_agent = "unknown".to_string();
    
    match authenticate_user(pool, &login_req).await {
        Ok(Some(user)) => {
            println!("🎯 开始创建用户会话");
            // 创建用户会话
            match create_user_session(pool, user.id, Some(user_agent.clone()), Some(ip_address)).await {
                Ok(session) => {
                    println!("✅ 会话创建成功");
                    // 更新最后登录时间
                    let _ = update_last_login(pool, user.id).await;
                    println!("✅ 更新登录时间完成");
                    
                    // 记录成功登录日志
                    let _ = log_login_attempt(
                        pool,
                        Some(user.id),
                        &login_req.username,
                        true,
                        Some(ip_address),
                        Some(user_agent),
                        None,
                    ).await;
                    println!("✅ 登录日志记录完成");
                    
                    // 设置会话Cookie
                    println!("🍪 开始设置Cookie");
                    let mut cookie = Cookie::new("session_token", session.session_token.clone());
                    cookie.set_same_site(SameSite::Lax);
                    cookie.set_http_only(true);
                    // 设置过期时间为8小时后
                    cookie.set_expires(OffsetDateTime::now_utc() + Duration::hours(8));
                    cookie.set_path("/");
                    cookies.add_private(cookie);
                    println!("✅ Cookie设置完成");
                    
                    let response = LoginResponse {
                        user: UserInfo::from(user.clone()),
                        session_token: session.session_token,
                        expires_at: session.expires_at,
                    };
                    println!("✅ 准备返回登录响应");
                    
                    Ok(Json(ApiResponse::success(response)))
                }
                Err(_) => {
                    // 记录失败日志
                    let _ = log_login_attempt(
                        pool,
                        Some(user.id),
                        &login_req.username,
                        false,
                        Some(ip_address),
                        Some(user_agent),
                        Some("会话创建失败".to_string()),
                    ).await;
                    
                    Err(Status::InternalServerError)
                }
            }
        }
        Ok(None) => {
            // 记录失败登录日志
            let _ = log_login_attempt(
                pool,
                None,
                &login_req.username,
                false,
                Some(ip_address),
                Some(user_agent),
                Some("用户名或密码错误".to_string()),
            ).await;
            
            Ok(Json(ApiResponse::error("用户名或密码错误")))
        }
        Err(_) => Err(Status::InternalServerError),
    }
}

// 注册功能暂时禁用
/*
#[post("/api/auth/register", data = "<register_req>")]
pub async fn register(
    pool: &State<DbPool>,
    register_req: Json<RegisterRequest>,
) -> Result<Json<ApiResponse<UserInfo>>, Status> {
    match register_user(pool, &register_req).await {
        Ok(user) => {
            let user_info = UserInfo::from(user);
            Ok(Json(ApiResponse::success(user_info)))
        }
        Err(e) => {
            if let Some(db_error) = e.as_db_error() {
                if db_error.code().code() == "23505" { // unique_violation
                    return Ok(Json(ApiResponse::error("用户名或邮箱已存在")));
                }
            }
            Ok(Json(ApiResponse::error("注册失败")))
        }
    }
}
*/

#[post("/api/auth/logout")]
pub async fn logout(
    pool: &State<DbPool>,
    cookies: &CookieJar<'_>,
    auth_user: AuthenticatedUser,
) -> Json<ApiResponse<()>> {
    // 删除会话
    let _ = logout_session(pool, &auth_user.session.session_token).await;
    
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