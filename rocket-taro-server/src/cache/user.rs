use uuid::Uuid;
use serde::{Serialize, Deserialize};
use crate::models::auth::User;
use crate::cache::{RedisPool, cache_key, ttl};
use tracing::{debug, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedUser {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub is_admin: bool,
}

impl From<User> for CachedUser {
    fn from(user: User) -> Self {
        CachedUser {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            is_admin: user.is_admin,
        }
    }
}

pub struct UserCache {
    redis: RedisPool,
}

impl UserCache {
    pub fn new(redis: RedisPool) -> Self {
        Self { redis }
    }

    // 缓存用户信息
    pub async fn cache_user(&self, user: &User) -> Result<(), redis::RedisError> {
        let key = cache_key("user", &user.id.to_string());
        let cached_user = CachedUser::from(user.clone());
        
        debug!("Caching user info for user_id: {}", user.id);
        self.redis.set(&key, &cached_user, ttl::USER_INFO).await
    }

    // 获取缓存的用户信息
    pub async fn get_user(&self, user_id: Uuid) -> Result<Option<CachedUser>, redis::RedisError> {
        let key = cache_key("user", &user_id.to_string());
        debug!("Getting cached user info for user_id: {}", user_id);
        self.redis.get(&key).await
    }

    // 缓存用户名到用户ID的映射
    pub async fn cache_username_mapping(&self, username: &str, user_id: Uuid) -> Result<(), redis::RedisError> {
        let key = cache_key("username", username);
        debug!("Caching username mapping: {} -> {}", username, user_id);
        self.redis.set(&key, &user_id.to_string(), ttl::USER_INFO).await
    }

    // 获取用户名对应的用户ID
    pub async fn get_user_id_by_username(&self, username: &str) -> Result<Option<Uuid>, redis::RedisError> {
        let key = cache_key("username", username);
        debug!("Getting user_id for username: {}", username);
        
        match self.redis.get::<String>(&key).await? {
            Some(user_id_str) => {
                match Uuid::parse_str(&user_id_str) {
                    Ok(user_id) => Ok(Some(user_id)),
                    Err(e) => {
                        warn!("Invalid UUID in username cache for {}: {}", username, e);
                        Ok(None)
                    }
                }
            }
            None => Ok(None),
        }
    }

    // 删除用户缓存
    pub async fn invalidate_user(&self, user_id: Uuid) -> Result<(), redis::RedisError> {
        let user_key = cache_key("user", &user_id.to_string());
        debug!("Invalidating user cache for user_id: {}", user_id);
        self.redis.delete(&user_key).await?;
        Ok(())
    }

    // 删除用户名映射缓存
    pub async fn invalidate_username(&self, username: &str) -> Result<(), redis::RedisError> {
        let username_key = cache_key("username", username);
        debug!("Invalidating username cache for username: {}", username);
        self.redis.delete(&username_key).await?;
        Ok(())
    }

    // 记录登录失败次数
    pub async fn record_login_failure(&self, username: &str) -> Result<i64, redis::RedisError> {
        let key = cache_key("login_failures", username);
        debug!("Recording login failure for username: {}", username);
        
        let count = self.redis.increment(&key, 1).await?;
        // 设置过期时间
        self.redis.expire(&key, ttl::LOGIN_ATTEMPTS).await?;
        Ok(count)
    }

    // 获取登录失败次数
    pub async fn get_login_failures(&self, username: &str) -> Result<i64, redis::RedisError> {
        let key = cache_key("login_failures", username);
        debug!("Getting login failure count for username: {}", username);
        
        match self.redis.get::<i64>(&key).await? {
            Some(count) => Ok(count),
            None => Ok(0),
        }
    }

    // 清除登录失败记录
    pub async fn clear_login_failures(&self, username: &str) -> Result<(), redis::RedisError> {
        let key = cache_key("login_failures", username);
        debug!("Clearing login failures for username: {}", username);
        self.redis.delete(&key).await?;
        Ok(())
    }

    // 检查是否被锁定
    pub async fn is_account_locked(&self, username: &str, max_attempts: i64) -> Result<bool, redis::RedisError> {
        let failures = self.get_login_failures(username).await?;
        Ok(failures >= max_attempts)
    }
}