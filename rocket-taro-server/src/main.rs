#![allow(dead_code)]

#[macro_use] extern crate rocket;

mod fairings;
mod routes;
mod models;
mod database;
mod auth;
mod cache;
mod use_cases;
mod config;
mod utils;

use rocket::fs::{FileServer, relative};
use tracing_subscriber;
use config::RouteConfig;

#[launch]
async fn rocket() -> _ {
    // 初始化日志系统
    tracing_subscriber::fmt::init();
    
    // 初始化数据库连接
    let db_pool = database::create_connection().await
        .expect("Failed to connect to database");
    
    // 初始化路由配置
    let route_config = RouteConfig::from_file("routes.toml")
        .expect("Failed to load route configuration");
    
    // 验证路由配置
    route_config.validate()
        .expect("Route configuration validation failed");

    rocket::build()
        .manage(db_pool)
        .manage(route_config)
        .mount("/api", routes![
            routes::api::health_check,
            routes::api::get_user,
            routes::api::get_data,
            routes::api::get_public_config,
        ])
        .mount("/", routes![
            routes::user_data::create_user_data,
            routes::user_data::get_user_data,
            routes::auth::login,
            routes::auth::register,
            routes::auth::logout,
            routes::auth::get_current_user,
            routes::auth::auth_status,
            routes::auth::guest_login,
            routes::auth::wx_login,
            routes::auth::update_user_profile,
            routes::cache::cache_health_check,
            routes::cache::invalidate_cache,
            routes::cache::cleanup_expired_sessions,
            routes::metrics::receive_route_command_error_metric,
            routes::metrics::receive_performance_metric,
            routes::metrics::get_system_health
        ])
        .mount("/", routes::cors::cors_routes())
        .mount("/", FileServer::from(relative!("frontend/dist")))
        .attach(fairings::cors::CORS)
        .attach(cache::CacheFairing)
}