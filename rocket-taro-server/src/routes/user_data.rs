use rocket::{State, serde::json::Json, get, post};
use crate::models::{response::ApiResponse, user_data::{UserData, NewUserData}};
use crate::database::{DbPool, insert_user_data, get_all_user_data};
use crate::cache::{RedisPool, data::DataCache};
use tracing::{info, debug};

#[post("/api/user-data", data = "<new_data>")]
pub async fn create_user_data(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
    new_data: Json<NewUserData>,
) -> Json<ApiResponse<UserData>> {
    let user_data = UserData::new(new_data.into_inner());
    let data_cache = DataCache::new(redis.inner().clone());
    
    match insert_user_data(pool, &user_data).await {
        Ok(_) => {
            info!("User data created successfully: {}", user_data.id);
            
            // 缓存新创建的用户数据
            if let Err(e) = data_cache.cache_user_data(&user_data).await {
                debug!("Failed to cache new user data: {}", e);
            }
            
            // 清除所有用户数据列表缓存
            if let Err(e) = data_cache.invalidate_all_user_data().await {
                debug!("Failed to invalidate all user data cache: {}", e);
            }
            
            Json(ApiResponse::success(user_data))
        }
        Err(e) => Json(ApiResponse::error(&format!("数据保存失败: {}", e))),
    }
}

#[get("/api/user-data")]
pub async fn get_user_data(
    pool: &State<DbPool>,
    redis: &State<RedisPool>,
) -> Json<ApiResponse<Vec<UserData>>> {
    let data_cache = DataCache::new(redis.inner().clone());
    
    // 优先从缓存获取数据
    match data_cache.get_all_user_data().await {
        Ok(Some(cached_data)) => {
            debug!("Retrieved user data from cache ({} items)", cached_data.len());
            // 转换缓存数据为原始类型
            let user_data: Vec<UserData> = cached_data.into_iter().map(|cached| UserData {
                id: cached.id,
                name: cached.name,
                email: cached.email,
                phone: cached.phone,
                message: cached.message,
                created_at: chrono::Utc::now(), // 缓存中不存储时间字段，使用当前时间
            }).collect();
            Json(ApiResponse::success(user_data))
        }
        Ok(None) => {
            debug!("Cache miss, retrieving user data from database");
            // 缓存未命中，从数据库获取
            match get_all_user_data(pool).await {
                Ok(data) => {
                    info!("Retrieved user data from database ({} items)", data.len());
                    // 缓存数据库结果
                    if let Err(e) = data_cache.cache_all_user_data(&data).await {
                        debug!("Failed to cache user data: {}", e);
                    }
                    Json(ApiResponse::success(data))
                }
                Err(e) => Json(ApiResponse::error(&format!("获取数据失败: {}", e))),
            }
        }
        Err(e) => {
            debug!("Cache error, falling back to database: {}", e);
            // 缓存错误，回退到数据库
            match get_all_user_data(pool).await {
                Ok(data) => Json(ApiResponse::success(data)),
                Err(e) => Json(ApiResponse::error(&format!("获取数据失败: {}", e))),
            }
        }
    }
}