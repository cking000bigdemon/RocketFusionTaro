use rocket::{State, serde::json::Json, get, post};
use serde::{Serialize, Deserialize};
use tracing::info;

use crate::models::response::ApiResponse;
use crate::cache::{
    RedisPool,
    session::SessionCache,
};
use crate::auth::guards::AdminUser;

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheHealthCheck {
    pub redis_connected: bool,
    pub total_keys: usize,
}

// 缓存健康检查
#[get("/api/cache/health")]
pub async fn cache_health_check(
    redis: &State<RedisPool>,
    _admin: AdminUser,
) -> Json<ApiResponse<CacheHealthCheck>> {
    // 检查Redis连接状态
    let redis_connected = redis.exists("health_check").await.is_ok();
    
    // 获取缓存统计信息
    let all_keys = redis.keys("rocket_taro:*").await.unwrap_or_default();

    let health = CacheHealthCheck {
        redis_connected,
        total_keys: all_keys.len(),
    };

    Json(ApiResponse::success(health))
}

// 清除所有缓存（简化版）
#[post("/api/cache/invalidate")]
pub async fn invalidate_cache(
    redis: &State<RedisPool>,
    _admin: AdminUser,
) -> Json<ApiResponse<String>> {
    // 清除所有应用缓存
    let pattern = "rocket_taro:*";
    match redis.delete_pattern(pattern).await {
        Ok(count) => {
            info!("Invalidated all cache entries ({})", count);
            Json(ApiResponse::success(format!("已清除所有缓存 ({} 个条目)", count)))
        }
        Err(e) => Json(ApiResponse::error(&format!("缓存清除失败: {}", e))),
    }
}

// 清理过期会话缓存
#[post("/api/cache/cleanup")]
pub async fn cleanup_expired_sessions(
    redis: &State<RedisPool>,
    _admin: AdminUser,
) -> Json<ApiResponse<String>> {
    let session_cache = SessionCache::new(redis.inner().clone());
    
    match session_cache.cleanup_expired_sessions().await {
        Ok(count) => {
            info!("Cleaned up {} expired sessions", count);
            Json(ApiResponse::success(format!("清理了 {} 个过期会话", count)))
        }
        Err(e) => Json(ApiResponse::error(&format!("清理过期会话失败: {}", e))),
    }
}