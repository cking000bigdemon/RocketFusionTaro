use rocket::{async_trait, Rocket, Build, fairing::{Fairing, Info, Kind}};
use tracing::{info, error, debug};

pub mod redis;
pub mod user;
pub mod session;
pub mod data;

pub use redis::RedisPool;

pub struct CacheFairing;

#[async_trait]
impl Fairing for CacheFairing {
    fn info(&self) -> Info {
        Info {
            name: "Cache Fairing",
            kind: Kind::Ignite,
        }
    }

    async fn on_ignite(&self, rocket: Rocket<Build>) -> rocket::fairing::Result {
        info!("Initializing Redis cache connection...");
        
        let figment = rocket.figment();
        let redis_url: String = match figment.extract_inner("cache.redis_url") {
            Ok(url) => url,
            Err(e) => {
                error!("Failed to read Redis URL from configuration: {}", e);
                return Err(rocket);
            }
        };

        debug!("Connecting to Redis at configured URL");
        
        match redis::RedisPool::new(&redis_url).await {
            Ok(pool) => {
                info!("Redis cache connection established successfully");
                Ok(rocket.manage(pool))
            }
            Err(e) => {
                error!("Failed to establish Redis connection: {}", e);
                Err(rocket)
            }
        }
    }
}

// 缓存键前缀
pub const CACHE_PREFIX: &str = "rocket_taro";

// 生成缓存键的工具函数
pub fn cache_key(category: &str, identifier: &str) -> String {
    format!("{}:{}:{}", CACHE_PREFIX, category, identifier)
}

// 常用缓存过期时间（秒）
pub mod ttl {
    pub const USER_SESSION: usize = 7 * 24 * 3600; // 7天
    pub const USER_INFO: usize = 30 * 60; // 30分钟
    pub const USER_DATA: usize = 10 * 60; // 10分钟
    pub const LOGIN_ATTEMPTS: usize = 15 * 60; // 15分钟
}