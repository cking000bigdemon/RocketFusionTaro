use rocket::{Request, State, request::{self, FromRequest}, http::Status};
use crate::database::{DbPool, auth::validate_session};
use crate::models::auth::{User, UserSession};
use crate::cache::{RedisPool, session::SessionCache};
use std::net::IpAddr;
use tracing::{debug, warn};

#[derive(Debug)]
pub struct AuthenticatedUser {
    pub user: User,
    pub session: UserSession,
}

#[derive(Debug)]
pub enum AuthError {
    Missing,
    Invalid,
    Expired,
    DatabaseError,
}

// 认证用户请求守卫
#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthenticatedUser {
    type Error = AuthError;

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        // 从Cookie或Authorization头获取会话令牌
        let session_token = req.cookies()
            .get_private("session_token")
            .and_then(|cookie| Some(cookie.value().to_string()))
            .or_else(|| {
                req.headers()
                    .get_one("Authorization")
                    .and_then(|auth| {
                        if auth.starts_with("Bearer ") {
                            Some(auth[7..].to_string())
                        } else {
                            None
                        }
                    })
            });

        if let Some(token) = session_token {
            // 优先从Redis缓存获取会话信息
            if let Some(redis_pool) = req.guard::<&State<RedisPool>>().await.succeeded() {
                let session_cache = SessionCache::new(redis_pool.inner().clone());
                
                match session_cache.get_user_session_by_token(&token).await {
                    Ok(Some(cached_session)) => {
                        debug!("Session found in cache for token");
                        // 更新会话访问时间
                        if let Err(e) = session_cache.update_session_access(&token).await {
                            debug!("Failed to update session access time: {}", e);
                        }
                        
                        // 转换缓存的数据为原始类型
                        let user = User {
                            id: cached_session.user.id,
                            username: cached_session.user.username,
                            email: cached_session.user.email,
                            full_name: cached_session.user.full_name,
                            avatar_url: cached_session.user.avatar_url,
                            is_active: cached_session.user.is_active,
                            is_admin: cached_session.user.is_admin,
                            is_guest: cached_session.user.is_guest,
                            wx_openid: cached_session.user.wx_openid,
                            wx_unionid: cached_session.user.wx_unionid,
                            wx_session_key: cached_session.user.wx_session_key,
                            last_login_at: None, // 缓存中不存储这些时间字段
                            created_at: cached_session.session.created_at,
                            updated_at: cached_session.session.created_at,
                        };
                        
                        let session = UserSession {
                            id: cached_session.session.id,
                            user_id: cached_session.session.user_id,
                            session_token: cached_session.session.session_token,
                            user_agent: cached_session.session.user_agent,
                            ip_address: cached_session.session.ip_address,
                            expires_at: cached_session.session.expires_at,
                            created_at: cached_session.session.created_at,
                        };
                        
                        return request::Outcome::Success(AuthenticatedUser { user, session });
                    }
                    Ok(None) => {
                        debug!("Session not found in cache, checking database");
                    }
                    Err(e) => {
                        warn!("Cache lookup failed, falling back to database: {}", e);
                    }
                }
            }
            
            // 缓存未命中或失败，回退到数据库验证
            if let Some(db_pool) = req.guard::<&State<DbPool>>().await.succeeded() {
                match validate_session(db_pool, &token).await {
                    Ok(Some((user, session))) => {
                        debug!("Session validated from database");
                        // 尝试缓存会话信息
                        if let Some(redis_pool) = req.guard::<&State<RedisPool>>().await.succeeded() {
                            let session_cache = SessionCache::new(redis_pool.inner().clone());
                            if let Err(e) = session_cache.cache_user_session(&user, &session).await {
                                debug!("Failed to cache user session after database validation: {}", e);
                            }
                        }
                        request::Outcome::Success(AuthenticatedUser { user, session })
                    }
                    Ok(None) => request::Outcome::Error((Status::Unauthorized, AuthError::Invalid)),
                    Err(_) => request::Outcome::Error((Status::InternalServerError, AuthError::DatabaseError)),
                }
            } else {
                request::Outcome::Error((Status::InternalServerError, AuthError::DatabaseError))
            }
        } else {
            request::Outcome::Error((Status::Unauthorized, AuthError::Missing))
        }
    }
}

// 可选认证用户请求守卫
pub struct OptionalUser(pub Option<AuthenticatedUser>);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for OptionalUser {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        match AuthenticatedUser::from_request(req).await {
            request::Outcome::Success(user) => request::Outcome::Success(OptionalUser(Some(user))),
            _ => request::Outcome::Success(OptionalUser(None)),
        }
    }
}

// 管理员请求守卫
pub struct AdminUser(pub AuthenticatedUser);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminUser {
    type Error = AuthError;

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        match AuthenticatedUser::from_request(req).await {
            request::Outcome::Success(auth_user) => {
                if auth_user.user.is_admin {
                    request::Outcome::Success(AdminUser(auth_user))
                } else {
                    request::Outcome::Error((Status::Forbidden, AuthError::Invalid))
                }
            }
            request::Outcome::Error(e) => request::Outcome::Error(e),
            request::Outcome::Forward(f) => request::Outcome::Forward(f),
        }
    }
}

// 请求信息获取守卫
pub struct RequestInfo {
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for RequestInfo {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        // 获取客户端IP地址
        let ip_address = req.headers().get_one("X-Real-IP")
            .and_then(|ip_str| ip_str.parse().ok())
            .or_else(|| {
                req.headers().get_one("X-Forwarded-For")
                    .and_then(|forwarded| forwarded.split(',').next())
                    .and_then(|ip_str| ip_str.trim().parse().ok())
            })
            .or_else(|| req.client_ip());
        
        // 获取User-Agent
        let user_agent = req.headers().get_one("User-Agent").map(|s| s.to_string());
        
        request::Outcome::Success(RequestInfo {
            ip_address,
            user_agent,
        })
    }
}