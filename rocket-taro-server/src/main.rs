#![allow(dead_code)]

#[macro_use] extern crate rocket;

mod fairings;
mod routes;
mod models;
mod database;
mod auth;
mod cache;
mod use_cases;

use rocket::fs::{FileServer, relative};
use tracing_subscriber;

#[launch]
async fn rocket() -> _ {
    // 初始化日志系统
    tracing_subscriber::fmt::init();
    
    // 初始化数据库连接
    let db_pool = database::create_connection().await
        .expect("Failed to connect to database");

    rocket::build()
        .manage(db_pool)
        .mount("/api", routes![
            routes::api::health_check,
            routes::api::get_user,
            routes::api::get_data,
        ])
        .mount("/", routes![
            routes::user_data::create_user_data,
            routes::user_data::get_user_data,
            routes::mock_user_data::create_mock_user_data,
            routes::mock_user_data::get_mock_user_data,
            routes::auth::login,
            // routes::auth::register,  // 暂时禁用
            routes::auth::logout,
            routes::auth::get_current_user,
            routes::auth::auth_status,
            routes::auth::check_auth,
            routes::cache::cache_health_check,
            routes::cache::invalidate_cache,
            routes::cache::cleanup_expired_sessions,
            routes::cache::get_cache_keys,
            routes::cache::warmup_cache,
            routes::metrics::receive_route_command_error_metric,
            routes::metrics::receive_performance_metric,
            routes::metrics::get_system_health
        ])
        .mount("/", routes::cors::cors_routes())
        .mount("/", FileServer::from(relative!("frontend/dist")))
        .attach(fairings::cors::CORS)
        .attach(cache::CacheFairing)
}