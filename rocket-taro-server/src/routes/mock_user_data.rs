use rocket::{serde::json::Json, get, post};
use crate::models::{response::ApiResponse, user_data::{UserData, NewUserData}};

#[post("/api/mock-user-data", data = "<new_data>")]
pub async fn create_mock_user_data(
    new_data: Json<NewUserData>,
) -> Json<ApiResponse<UserData>> {
    let user_data = UserData::new(new_data.into_inner());
    
    // 模拟保存成功
    Json(ApiResponse::success(user_data))
}

#[get("/api/mock-user-data")]
pub async fn get_mock_user_data() -> Json<ApiResponse<Vec<UserData>>> {
    // 返回模拟数据
    let mock_data = vec![
        UserData {
            id: uuid::Uuid::new_v4(),
            name: "张三".to_string(),
            email: "zhangsan@example.com".to_string(),
            phone: Some("13800138000".to_string()),
            message: Some("这是测试数据".to_string()),
            created_at: chrono::Utc::now(),
        },
        UserData {
            id: uuid::Uuid::new_v4(),
            name: "李四".to_string(),
            email: "lisi@example.com".to_string(),
            phone: None,
            message: Some("另一条测试数据".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::hours(1),
        },
    ];
    
    Json(ApiResponse::success(mock_data))
}