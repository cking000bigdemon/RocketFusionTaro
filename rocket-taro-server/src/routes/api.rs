use rocket::serde::json::Json;
use rocket::State;
use crate::models::response::{ApiResponse, User};
use crate::database::DbPool;
use crate::cache::RedisPool;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SystemHealth {
    pub status: String,
    pub database: bool,
    pub cache: bool,
}

#[get("/health")]
pub async fn health_check(
    database: &State<DbPool>,
    redis: &State<RedisPool>,
) -> Json<ApiResponse<SystemHealth>> {
    // 检查数据库连接
    let database_ok = {
        let client = database.lock().await;
        client.query_one("SELECT 1", &[]).await.is_ok()
    };
    
    // 检查缓存连接
    let cache_ok = redis.exists("health_check").await.is_ok();
    
    let health = SystemHealth {
        status: "ok".to_string(),
        database: database_ok,
        cache: cache_ok,
    };
    
    Json(ApiResponse::success(health))
}

#[get("/user", format = "json")]
pub fn get_user() -> Json<ApiResponse<User>> {
    let user = User {
        id: 1,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
    };
    Json(ApiResponse::success(user))
}

#[get("/data", format = "json")]
pub fn get_data() -> Json<ApiResponse<Vec<User>>> {
    let users = vec![
        User {
            id: 1,
            name: "Alice".to_string(),
            email: "alice@example.com".to_string(),
        },
        User {
            id: 2,
            name: "Bob".to_string(),
            email: "bob@example.com".to_string(),
        },
    ];
    Json(ApiResponse::success(users))
}