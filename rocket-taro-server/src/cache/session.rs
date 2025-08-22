use uuid::Uuid;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use crate::models::auth::{User, UserSession};
use crate::cache::{RedisPool, cache_key, ttl};
use tracing::{debug, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub session_token: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl From<UserSession> for CachedSession {
    fn from(session: UserSession) -> Self {
        CachedSession {
            id: session.id,
            user_id: session.user_id,
            session_token: session.session_token,
            user_agent: session.user_agent,
            ip_address: session.ip_address,
            expires_at: session.expires_at,
            created_at: session.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedUserSession {
    pub user: crate::cache::user::CachedUser,
    pub session: CachedSession,
}

pub struct SessionCache {
    redis: RedisPool,
}

impl SessionCache {
    pub fn new(redis: RedisPool) -> Self {
        Self { redis }
    }

    // 缓存会话信息
    pub async fn cache_session(&self, session: &UserSession) -> Result<(), redis::RedisError> {
        let token_key = cache_key("session_token", &session.session_token);
        let session_key = cache_key("session", &session.id.to_string());
        let cached_session = CachedSession {
            id: session.id,
            user_id: session.user_id,
            session_token: session.session_token.clone(),
            user_agent: session.user_agent.clone(),
            ip_address: session.ip_address.clone(),
            expires_at: session.expires_at,
            created_at: session.created_at,
        };
        
        debug!("Caching session for token: {}", session.session_token);
        
        // 缓存会话令牌到会话信息的映射
        self.redis.set(&token_key, &cached_session, ttl::USER_SESSION).await?;
        
        // 缓存会话ID到会话信息的映射
        self.redis.set(&session_key, &cached_session, ttl::USER_SESSION).await?;
        
        Ok(())
    }

    // 缓存用户会话组合信息
    pub async fn cache_user_session(&self, user: &User, session: &UserSession) -> Result<(), redis::RedisError> {
        let key = cache_key("user_session", &session.session_token);
        let cached_user_session = CachedUserSession {
            user: crate::cache::user::CachedUser::from(user.clone()),
            session: CachedSession {
                id: session.id,
                user_id: session.user_id,
                session_token: session.session_token.clone(),
                user_agent: session.user_agent.clone(),
                ip_address: session.ip_address.clone(),
                expires_at: session.expires_at,
                created_at: session.created_at,
            },
        };
        
        debug!("Caching user session for token: {}", session.session_token);
        self.redis.set(&key, &cached_user_session, ttl::USER_SESSION).await
    }

    // 通过会话令牌获取会话信息
    pub async fn get_session_by_token(&self, session_token: &str) -> Result<Option<CachedSession>, redis::RedisError> {
        let key = cache_key("session_token", session_token);
        debug!("Getting session by token: {}", session_token);
        self.redis.get(&key).await
    }

    // 通过会话令牌获取用户会话组合信息
    pub async fn get_user_session_by_token(&self, session_token: &str) -> Result<Option<CachedUserSession>, redis::RedisError> {
        let key = cache_key("user_session", session_token);
        debug!("Getting user session by token: {}", session_token);
        self.redis.get(&key).await
    }

    // 通过会话ID获取会话信息
    pub async fn get_session_by_id(&self, session_id: Uuid) -> Result<Option<CachedSession>, redis::RedisError> {
        let key = cache_key("session", &session_id.to_string());
        debug!("Getting session by ID: {}", session_id);
        self.redis.get(&key).await
    }

    // 删除会话缓存
    pub async fn invalidate_session(&self, session_token: &str) -> Result<(), redis::RedisError> {
        let token_key = cache_key("session_token", session_token);
        let user_session_key = cache_key("user_session", session_token);
        
        debug!("Invalidating session cache for token: {}", session_token);
        
        // 需要先获取会话信息以便删除session_id缓存
        if let Some(session) = self.get_session_by_token(session_token).await? {
            let session_key = cache_key("session", &session.id.to_string());
            self.redis.delete(&session_key).await?;
        }
        
        self.redis.delete(&token_key).await?;
        self.redis.delete(&user_session_key).await?;
        
        Ok(())
    }

    // 删除用户的所有会话缓存
    pub async fn invalidate_user_sessions(&self, user_id: Uuid) -> Result<u64, redis::RedisError> {
        let pattern = cache_key("user_session", "*");
        debug!("Invalidating all sessions for user_id: {}", user_id);
        
        // 获取所有用户会话键
        let keys = self.redis.keys(&pattern).await?;
        let mut deleted_count = 0;
        
        for key in keys {
            if let Some(user_session) = self.redis.get::<CachedUserSession>(&key).await? {
                if user_session.user.id == user_id {
                    // 删除相关的所有缓存
                    self.invalidate_session(&user_session.session.session_token).await?;
                    deleted_count += 1;
                }
            }
        }
        
        info!("Invalidated {} sessions for user_id: {}", deleted_count, user_id);
        Ok(deleted_count)
    }

    // 更新会话最后访问时间
    pub async fn update_session_access(&self, session_token: &str) -> Result<(), redis::RedisError> {
        let key = cache_key("session_access", session_token);
        let now = Utc::now().timestamp();
        
        debug!("Updating session access time for token: {}", session_token);
        self.redis.set(&key, &now, ttl::USER_SESSION).await
    }

    // 获取会话最后访问时间
    pub async fn get_session_last_access(&self, session_token: &str) -> Result<Option<i64>, redis::RedisError> {
        let key = cache_key("session_access", session_token);
        debug!("Getting session last access time for token: {}", session_token);
        self.redis.get(&key).await
    }

    // 清理过期会话缓存
    pub async fn cleanup_expired_sessions(&self) -> Result<u64, redis::RedisError> {
        debug!("Starting cleanup of expired session caches");
        let now = Utc::now();
        let mut cleaned_count = 0;
        
        // 获取所有会话令牌缓存
        let pattern = cache_key("session_token", "*");
        let keys = self.redis.keys(&pattern).await?;
        
        for key in keys {
            if let Some(session) = self.redis.get::<CachedSession>(&key).await? {
                if session.expires_at < now {
                    self.invalidate_session(&session.session_token).await?;
                    cleaned_count += 1;
                }
            }
        }
        
        info!("Cleaned up {} expired session caches", cleaned_count);
        Ok(cleaned_count)
    }
}