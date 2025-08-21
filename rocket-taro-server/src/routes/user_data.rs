use rocket::{State, serde::json::Json, get, post};
use crate::models::{response::ApiResponse, user_data::{UserData, NewUserData}};
use crate::database::{DbPool, insert_user_data, get_all_user_data};

#[post("/api/user-data", data = "<new_data>")]
pub async fn create_user_data(
    pool: &State<DbPool>,
    new_data: Json<NewUserData>,
) -> Json<ApiResponse<UserData>> {
    let user_data = UserData::new(new_data.into_inner());
    
    match insert_user_data(pool, &user_data).await {
        Ok(_) => Json(ApiResponse::success(user_data)),
        Err(e) => Json(ApiResponse::error(&format!("数据保存失败: {}", e))),
    }
}

#[get("/api/user-data")]
pub async fn get_user_data(
    pool: &State<DbPool>,
) -> Json<ApiResponse<Vec<UserData>>> {
    match get_all_user_data(pool).await {
        Ok(data) => Json(ApiResponse::success(data)),
        Err(e) => Json(ApiResponse::error(&format!("获取数据失败: {}", e))),
    }
}