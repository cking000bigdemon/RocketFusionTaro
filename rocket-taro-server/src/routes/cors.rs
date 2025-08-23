use rocket::routes;
use rocket::options;
use rocket::http::Status;

/// 通用的 OPTIONS 预检请求处理器
#[options("/<_..>")]
pub fn options_handler() -> Status {
    Status::Ok
}

/// 为所有路由返回 CORS 路由
pub fn cors_routes() -> Vec<rocket::Route> {
    routes![options_handler]
}