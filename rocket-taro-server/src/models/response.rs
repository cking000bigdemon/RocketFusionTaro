use serde::{Deserialize, Serialize};
use super::route_command::RouteCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
    pub route_command: Option<RouteCommand>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: Some(data),
            route_command: None,
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            code: 500,
            message: message.to_string(),
            data: None,
            route_command: None,
        }
    }

    pub fn ok() -> Self {
        Self {
            code: 200,
            message: "ok".to_string(),
            data: None,
            route_command: None,
        }
    }
    
    /// 创建带路由指令的成功响应
    pub fn success_with_command(data: T, command: RouteCommand) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: Some(data),
            route_command: Some(command),
        }
    }
    
    /// 创建仅包含路由指令的响应
    pub fn command_only(command: RouteCommand) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: None,
            route_command: Some(command),
        }
    }
    
    /// 创建带路由指令的错误响应
    pub fn error_with_command(message: &str, command: RouteCommand) -> Self {
        Self {
            code: 500,
            message: message.to_string(),
            data: None,
            route_command: Some(command),
        }
    }
    
    /// 创建带导航的成功响应
    pub fn with_navigation(data: T, path: &str) -> Self {
        Self::success_with_command(
            data,
            RouteCommand::navigate_to(path),
        )
    }
    
    /// 创建带提示的成功响应
    pub fn with_toast(data: T, message: &str) -> Self {
        Self::success_with_command(
            data,
            RouteCommand::toast(message),
        )
    }
}