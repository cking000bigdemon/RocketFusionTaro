use rocket::serde::json::Json;
use crate::models::response::{ApiResponse, User};

#[get("/health")]
pub fn health_check() -> Json<ApiResponse<()>> {
    Json(ApiResponse::ok())
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