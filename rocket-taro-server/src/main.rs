#![allow(dead_code)]

#[macro_use] extern crate rocket;

mod fairings;
mod routes;
mod models;
mod database;
mod auth;

use rocket::fs::{FileServer, relative};

#[launch]
async fn rocket() -> _ {
    // 初始化数据库连接
    let db_pool = database::create_connection().await
        .expect("无法连接到数据库");

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
            routes::auth::check_auth
        ])
        .mount("/", FileServer::from(relative!("frontend/dist")))
        .attach(fairings::cors::CORS)
}