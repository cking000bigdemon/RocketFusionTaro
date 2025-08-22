use uuid::Uuid;
use serde::{Serialize, Deserialize};
use crate::models::user_data::UserData;
use crate::cache::{RedisPool, cache_key, ttl};
use tracing::{debug, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedUserData {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub message: Option<String>,
}

impl From<UserData> for CachedUserData {
    fn from(data: UserData) -> Self {
        CachedUserData {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: data.message,
        }
    }
}

pub struct DataCache {
    redis: RedisPool,
}

impl DataCache {
    pub fn new(redis: RedisPool) -> Self {
        Self { redis }
    }

    // 缓存单个用户数据
    pub async fn cache_user_data(&self, data: &UserData) -> Result<(), redis::RedisError> {
        let key = cache_key("user_data", &data.id.to_string());
        let cached_data = CachedUserData::from(data.clone());
        
        debug!("Caching user data for id: {}", data.id);
        self.redis.set(&key, &cached_data, ttl::USER_DATA).await
    }

    // 获取单个用户数据
    pub async fn get_user_data(&self, data_id: Uuid) -> Result<Option<CachedUserData>, redis::RedisError> {
        let key = cache_key("user_data", &data_id.to_string());
        debug!("Getting cached user data for id: {}", data_id);
        self.redis.get(&key).await
    }

    // 缓存所有用户数据列表
    pub async fn cache_all_user_data(&self, data_list: &[UserData]) -> Result<(), redis::RedisError> {
        let key = cache_key("all_user_data", "list");
        let cached_data: Vec<CachedUserData> = data_list.iter()
            .map(|data| CachedUserData::from(data.clone()))
            .collect();
        
        debug!("Caching all user data list ({} items)", data_list.len());
        self.redis.set(&key, &cached_data, ttl::USER_DATA).await
    }

    // 获取所有用户数据列表
    pub async fn get_all_user_data(&self) -> Result<Option<Vec<CachedUserData>>, redis::RedisError> {
        let key = cache_key("all_user_data", "list");
        debug!("Getting cached all user data list");
        self.redis.get(&key).await
    }

    // 删除单个用户数据缓存
    pub async fn invalidate_user_data(&self, data_id: Uuid) -> Result<(), redis::RedisError> {
        let key = cache_key("user_data", &data_id.to_string());
        debug!("Invalidating user data cache for id: {}", data_id);
        self.redis.delete(&key).await?;
        
        // 同时清除所有数据列表缓存
        self.invalidate_all_user_data().await
    }

    // 删除所有用户数据列表缓存
    pub async fn invalidate_all_user_data(&self) -> Result<(), redis::RedisError> {
        let key = cache_key("all_user_data", "list");
        debug!("Invalidating all user data list cache");
        self.redis.delete(&key).await?;
        Ok(())
    }

    // 预热缓存 - 用于系统启动时预加载常用数据
    pub async fn warm_up_cache(&self, data_list: &[UserData]) -> Result<(), redis::RedisError> {
        info!("Starting cache warm-up for user data");
        
        // 缓存所有数据列表
        self.cache_all_user_data(data_list).await?;
        
        // 缓存每个单独的数据项
        for data in data_list {
            self.cache_user_data(data).await?;
        }
        
        info!("Cache warm-up completed for {} user data items", data_list.len());
        Ok(())
    }

    // 批量缓存用户数据
    pub async fn batch_cache_user_data(&self, data_list: &[UserData]) -> Result<(), redis::RedisError> {
        debug!("Batch caching {} user data items", data_list.len());
        
        for data in data_list {
            if let Err(e) = self.cache_user_data(data).await {
                debug!("Failed to cache user data {}: {}", data.id, e);
                // 继续处理其他数据，不中断批量操作
            }
        }
        
        Ok(())
    }

    // 批量获取用户数据
    pub async fn batch_get_user_data(&self, data_ids: &[Uuid]) -> Result<Vec<Option<CachedUserData>>, redis::RedisError> {
        debug!("Batch getting {} user data items", data_ids.len());
        let mut results = Vec::new();
        
        for data_id in data_ids {
            match self.get_user_data(*data_id).await {
                Ok(data) => results.push(data),
                Err(e) => {
                    debug!("Failed to get cached user data {}: {}", data_id, e);
                    results.push(None);
                }
            }
        }
        
        Ok(results)
    }

    // 获取缓存统计信息
    pub async fn get_cache_stats(&self) -> Result<CacheStats, redis::RedisError> {
        let user_data_pattern = cache_key("user_data", "*");
        let all_data_key = cache_key("all_user_data", "list");
        
        let user_data_keys = self.redis.keys(&user_data_pattern).await?;
        let has_all_data = self.redis.exists(&all_data_key).await?;
        
        Ok(CacheStats {
            user_data_count: user_data_keys.len(),
            has_all_data_cache: has_all_data,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheStats {
    pub user_data_count: usize,
    pub has_all_data_cache: bool,
}