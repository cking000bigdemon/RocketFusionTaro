#![allow(dead_code)]

#[macro_use] extern crate rocket;

mod fairings;
mod routes;
mod models;

use rocket::fs::{FileServer, relative};

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/api", routes![
            routes::api::health_check,
            routes::api::get_user,
            routes::api::get_data
        ])
        .mount("/", FileServer::from(relative!("frontend/dist")))
        .attach(fairings::cors::CORS)
}