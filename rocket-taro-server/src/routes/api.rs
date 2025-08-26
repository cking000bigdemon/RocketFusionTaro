use rocket::serde::json::Json;
use rocket::State;
use crate::models::response::{ApiResponse, User};
use crate::database::DbPool;
use crate::cache::RedisPool;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::time::Instant;

#[derive(Serialize, Deserialize)]
pub struct SystemHealth {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub server: ServerStatus,
    pub database: DatabaseStatus,
    pub cache: CacheStatus,
    pub version: String,
}

#[derive(Serialize, Deserialize)]
pub struct ServerStatus {
    pub status: String,
    pub uptime: String,
    pub host: String,
    pub port: u16,
}

#[derive(Serialize, Deserialize)]
pub struct DatabaseStatus {
    pub status: String,
    pub connected: bool,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CacheStatus {
    pub status: String,
    pub connected: bool,
    pub host: String,
    pub port: u16,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
}

#[get("/health")]
pub async fn health_check(
    database: &State<DbPool>,
    redis: &State<RedisPool>,
) -> Json<ApiResponse<SystemHealth>> {
    let now = Utc::now();
    
    // 检查数据库连接和响应时间
    let database_status = {
        let start = Instant::now();
        let client = database.lock().await;
        
        match client.query_one("SELECT 1 as test", &[]).await {
            Ok(_) => DatabaseStatus {
                status: "healthy".to_string(),
                connected: true,
                host: "192.168.5.222".to_string(),
                port: 5432,
                database: "postgres".to_string(),
                response_time_ms: Some(start.elapsed().as_millis() as u64),
                error: None,
            },
            Err(e) => DatabaseStatus {
                status: "unhealthy".to_string(),
                connected: false,
                host: "192.168.5.222".to_string(),
                port: 5432,
                database: "postgres".to_string(),
                response_time_ms: None,
                error: Some(e.to_string()),
            }
        }
    };
    
    // 检查Redis缓存连接和响应时间
    let cache_status = {
        let start = Instant::now();
        let health_key = format!("health_check:{}", now.timestamp());
        
        match redis.set(&health_key, &"ping", 10).await {
            Ok(_) => {
                // 清理测试键
                let _ = redis.delete(&health_key).await;
                CacheStatus {
                    status: "healthy".to_string(),
                    connected: true,
                    host: "192.168.5.222".to_string(),
                    port: 6379,
                    response_time_ms: Some(start.elapsed().as_millis() as u64),
                    error: None,
                }
            },
            Err(e) => CacheStatus {
                status: "unhealthy".to_string(),
                connected: false,
                host: "192.168.5.222".to_string(),
                port: 6379,
                response_time_ms: None,
                error: Some(e.to_string()),
            }
        }
    };
    
    // 服务器状态
    let server_status = ServerStatus {
        status: "running".to_string(),
        uptime: "运行中".to_string(), // 实际项目中可以计算真实运行时间
        host: "0.0.0.0".to_string(),
        port: 8000,
    };
    
    // 整体状态判断
    let overall_status = if database_status.connected && cache_status.connected {
        "healthy"
    } else if !database_status.connected && !cache_status.connected {
        "critical"
    } else {
        "degraded"
    };
    
    let health = SystemHealth {
        status: overall_status.to_string(),
        timestamp: now,
        server: server_status,
        database: database_status,
        cache: cache_status,
        version: env!("CARGO_PKG_VERSION").to_string(),
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