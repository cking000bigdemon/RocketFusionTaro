use rocket::{State, serde::json::Json, get, post};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use tracing::{info, debug};

use crate::models::response::ApiResponse;
use crate::cache::{
    RedisPool,
    user::UserCache,
    session::SessionCache, 
    data::{DataCache, CacheStats}
};
use crate::auth::guards::AdminUser;

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheHealthCheck {
    pub redis_connected: bool,
    pub total_keys: usize,
    pub user_cache_count: usize,
    pub session_cache_count: usize,
    pub data_cache_stats: CacheStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheInvalidationRequest {
    pub cache_type: String, // "user", "session", "data", "all"
    pub identifier: Option<String>, // user_id, session_token, data_id等
}

// 缓存健康检查
#[get("/api/cache/health")]
pub async fn cache_health_check(
    redis: &State<RedisPool>,
    _admin: AdminUser,
) -> Json<ApiResponse<CacheHealthCheck>> {
    let _user_cache = UserCache::new(redis.inner().clone());
    let _session_cache = SessionCache::new(redis.inner().clone());
    let data_cache = DataCache::new(redis.inner().clone());

    // 检查Redis连接状态
    let redis_connected = redis.exists("health_check").await.is_ok();
    
    // 获取缓存统计信息
    let user_keys = redis.keys("rocket_taro:user:*").await.unwrap_or_default();
    let session_keys = redis.keys("rocket_taro:session*").await.unwrap_or_default();
    let data_cache_stats = data_cache.get_cache_stats().await.unwrap_or(CacheStats {
        user_data_count: 0,
        has_all_data_cache: false,
    });

    let health = CacheHealthCheck {
        redis_connected,
        total_keys: user_keys.len() + session_keys.len() + data_cache_stats.user_data_count,
        user_cache_count: user_keys.len(),
        session_cache_count: session_keys.len(),
        data_cache_stats,
    };

    Json(ApiResponse::success(health))
}

// 缓存失效接口
#[post("/api/cache/invalidate", data = "<invalidation_req>")]
pub async fn invalidate_cache(
    redis: &State<RedisPool>,
    invalidation_req: Json<CacheInvalidationRequest>,
    _admin: AdminUser,
) -> Json<ApiResponse<String>> {
    let user_cache = UserCache::new(redis.inner().clone());
    let session_cache = SessionCache::new(redis.inner().clone());
    let data_cache = DataCache::new(redis.inner().clone());

    let req = invalidation_req.into_inner();
    
    match req.cache_type.as_str() {
        "user" => {
            if let Some(user_id_str) = req.identifier {
                if let Ok(user_id) = Uuid::parse_str(&user_id_str) {
                    if let Err(e) = user_cache.invalidate_user(user_id).await {
                        return Json(ApiResponse::error(&format!("用户缓存失效失败: {}", e)));
                    }
                    info!("Invalidated user cache for user_id: {}", user_id);
                    Json(ApiResponse::success("用户缓存已失效".to_string()))
                } else {
                    Json(ApiResponse::error("无效的用户ID格式"))
                }
            } else {
                // 清除所有用户缓存
                let pattern = "rocket_taro:user:*";
                match redis.delete_pattern(pattern).await {
                    Ok(count) => {
                        info!("Invalidated {} user cache entries", count);
                        Json(ApiResponse::success(format!("已失效 {} 个用户缓存条目", count)))
                    }
                    Err(e) => Json(ApiResponse::error(&format!("用户缓存失效失败: {}", e))),
                }
            }
        }
        "session" => {
            if let Some(session_token) = req.identifier {
                if let Err(e) = session_cache.invalidate_session(&session_token).await {
                    return Json(ApiResponse::error(&format!("会话缓存失效失败: {}", e)));
                }
                info!("Invalidated session cache for token: {}", session_token);
                Json(ApiResponse::success("会话缓存已失效".to_string()))
            } else {
                // 清除所有会话缓存
                let pattern = "rocket_taro:session*";
                match redis.delete_pattern(pattern).await {
                    Ok(count) => {
                        info!("Invalidated {} session cache entries", count);
                        Json(ApiResponse::success(format!("已失效 {} 个会话缓存条目", count)))
                    }
                    Err(e) => Json(ApiResponse::error(&format!("会话缓存失效失败: {}", e))),
                }
            }
        }
        "data" => {
            if let Some(data_id_str) = req.identifier {
                if let Ok(data_id) = Uuid::parse_str(&data_id_str) {
                    if let Err(e) = data_cache.invalidate_user_data(data_id).await {
                        return Json(ApiResponse::error(&format!("数据缓存失效失败: {}", e)));
                    }
                    info!("Invalidated data cache for data_id: {}", data_id);
                    Json(ApiResponse::success("数据缓存已失效".to_string()))
                } else {
                    Json(ApiResponse::error("无效的数据ID格式"))
                }
            } else {
                // 清除所有数据缓存
                if let Err(e) = data_cache.invalidate_all_user_data().await {
                    return Json(ApiResponse::error(&format!("数据缓存失效失败: {}", e)));
                }
                let pattern = "rocket_taro:user_data:*";
                match redis.delete_pattern(pattern).await {
                    Ok(count) => {
                        info!("Invalidated {} data cache entries", count);
                        Json(ApiResponse::success(format!("已失效 {} 个数据缓存条目", count)))
                    }
                    Err(e) => Json(ApiResponse::error(&format!("数据缓存失效失败: {}", e))),
                }
            }
        }
        "all" => {
            // 清除所有缓存
            let pattern = "rocket_taro:*";
            match redis.delete_pattern(pattern).await {
                Ok(count) => {
                    info!("Invalidated all cache entries ({})", count);
                    Json(ApiResponse::success(format!("已清除所有缓存 ({} 个条目)", count)))
                }
                Err(e) => Json(ApiResponse::error(&format!("缓存清除失败: {}", e))),
            }
        }
        _ => Json(ApiResponse::error("不支持的缓存类型")),
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

// 获取缓存键列表（用于调试）
#[get("/api/cache/keys/<pattern>")]
pub async fn get_cache_keys(
    redis: &State<RedisPool>,
    pattern: String,
    _admin: AdminUser,
) -> Json<ApiResponse<Vec<String>>> {
    debug!("Getting cache keys for pattern: {}", pattern);
    
    let full_pattern = if pattern.starts_with("rocket_taro:") {
        pattern
    } else {
        format!("rocket_taro:{}*", pattern)
    };
    
    match redis.keys(&full_pattern).await {
        Ok(keys) => Json(ApiResponse::success(keys)),
        Err(e) => Json(ApiResponse::error(&format!("获取缓存键失败: {}", e))),
    }
}

// 预热缓存（可选实现）
#[post("/api/cache/warmup")]
pub async fn warmup_cache(
    pool: &State<crate::database::DbPool>,
    redis: &State<RedisPool>,
    _admin: AdminUser,
) -> Json<ApiResponse<String>> {
    let data_cache = DataCache::new(redis.inner().clone());
    
    debug!("Starting cache warmup");
    
    // 预热用户数据缓存
    match crate::database::get_all_user_data(pool).await {
        Ok(user_data) => {
            if let Err(e) = data_cache.warm_up_cache(&user_data).await {
                return Json(ApiResponse::error(&format!("缓存预热失败: {}", e)));
            }
            info!("Cache warmup completed for {} user data items", user_data.len());
            Json(ApiResponse::success(format!("缓存预热完成，预加载 {} 个用户数据", user_data.len())))
        }
        Err(e) => Json(ApiResponse::error(&format!("获取用户数据失败: {}", e))),
    }
}