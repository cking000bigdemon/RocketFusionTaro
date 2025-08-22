use redis::{Client, aio::ConnectionManager, AsyncCommands, RedisResult, RedisError};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tracing::{error, debug, warn};

#[derive(Clone)]
pub struct RedisPool {
    connection: Arc<ConnectionManager>,
}

impl RedisPool {
    pub async fn new(redis_url: &str) -> Result<Self, RedisError> {
        debug!("Creating Redis client connection");
        let client = Client::open(redis_url)?;
        let connection = ConnectionManager::new(client).await?;
        
        Ok(RedisPool {
            connection: Arc::new(connection),
        })
    }

    pub async fn get<T>(&self, key: &str) -> RedisResult<Option<T>>
    where
        T: for<'de> Deserialize<'de>,
    {
        debug!("Getting cache value for key: {}", key);
        let mut conn = (*self.connection).clone();
        
        match conn.get::<_, Option<String>>(key).await {
            Ok(Some(value)) => {
                match serde_json::from_str::<T>(&value) {
                    Ok(data) => Ok(Some(data)),
                    Err(e) => {
                        warn!("Failed to deserialize cached data for key {}: {}", key, e);
                        Ok(None)
                    }
                }
            }
            Ok(None) => Ok(None),
            Err(e) => {
                error!("Redis GET error for key {}: {}", key, e);
                Ok(None) // 优雅降级，返回None而不是错误
            }
        }
    }

    pub async fn set<T>(&self, key: &str, value: &T, ttl_seconds: usize) -> RedisResult<()>
    where
        T: Serialize,
    {
        debug!("Setting cache value for key: {} with TTL: {}s", key, ttl_seconds);
        let mut conn = (*self.connection).clone();
        
        match serde_json::to_string(value) {
            Ok(serialized) => {
                let result: RedisResult<()> = conn.set_ex(key, serialized, ttl_seconds as u64).await;
                if let Err(e) = &result {
                    error!("Redis SET error for key {}: {}", key, e);
                }
                result
            }
            Err(e) => {
                error!("Failed to serialize data for key {}: {}", key, e);
                Err(RedisError::from((redis::ErrorKind::TypeError, "Serialization failed")))
            }
        }
    }

    pub async fn delete(&self, key: &str) -> RedisResult<bool> {
        debug!("Deleting cache value for key: {}", key);
        let mut conn = (*self.connection).clone();
        
        match conn.del::<_, i32>(key).await {
            Ok(count) => Ok(count > 0),
            Err(e) => {
                error!("Redis DELETE error for key {}: {}", key, e);
                Ok(false) // 优雅降级
            }
        }
    }

    pub async fn exists(&self, key: &str) -> RedisResult<bool> {
        debug!("Checking existence of cache key: {}", key);
        let mut conn = (*self.connection).clone();
        
        match conn.exists::<_, bool>(key).await {
            Ok(exists) => Ok(exists),
            Err(e) => {
                error!("Redis EXISTS error for key {}: {}", key, e);
                Ok(false) // 优雅降级
            }
        }
    }

    pub async fn increment(&self, key: &str, delta: i64) -> RedisResult<i64> {
        debug!("Incrementing cache key: {} by {}", key, delta);
        let mut conn = (*self.connection).clone();
        
        match conn.incr(key, delta).await {
            Ok(value) => Ok(value),
            Err(e) => {
                error!("Redis INCR error for key {}: {}", key, e);
                Err(e)
            }
        }
    }

    pub async fn expire(&self, key: &str, ttl_seconds: usize) -> RedisResult<bool> {
        debug!("Setting expiration for key: {} to {}s", key, ttl_seconds);
        let mut conn = (*self.connection).clone();
        
        match conn.expire(key, ttl_seconds as i64).await {
            Ok(success) => Ok(success),
            Err(e) => {
                error!("Redis EXPIRE error for key {}: {}", key, e);
                Ok(false) // 优雅降级
            }
        }
    }

    pub async fn keys(&self, pattern: &str) -> RedisResult<Vec<String>> {
        debug!("Getting keys matching pattern: {}", pattern);
        let mut conn = (*self.connection).clone();
        
        match conn.keys(pattern).await {
            Ok(keys) => Ok(keys),
            Err(e) => {
                error!("Redis KEYS error for pattern {}: {}", pattern, e);
                Ok(Vec::new()) // 优雅降级
            }
        }
    }

    pub async fn delete_pattern(&self, pattern: &str) -> RedisResult<u64> {
        debug!("Deleting keys matching pattern: {}", pattern);
        
        match self.keys(pattern).await {
            Ok(keys) => {
                if keys.is_empty() {
                    return Ok(0);
                }
                
                let mut conn = (*self.connection).clone();
                match conn.del::<_, u64>(&keys).await {
                    Ok(count) => Ok(count),
                    Err(e) => {
                        error!("Redis DELETE pattern error for pattern {}: {}", pattern, e);
                        Ok(0) // 优雅降级
                    }
                }
            }
            Err(e) => {
                error!("Failed to get keys for pattern {}: {}", pattern, e);
                Ok(0)
            }
        }
    }
}