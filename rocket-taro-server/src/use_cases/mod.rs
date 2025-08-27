pub mod auth_use_case;
pub mod wx_auth_use_case;
pub mod route_command_generator;  // 新增：路由决策器

use std::error::Error;
use std::fmt;

/// 用例执行错误类型
#[derive(Debug)]
pub enum UseCaseError {
    DatabaseError(String),
    ValidationError(String),
    AuthenticationError(String),
    BusinessLogicError(String),
    InternalError(String),
}

impl fmt::Display for UseCaseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UseCaseError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            UseCaseError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            UseCaseError::AuthenticationError(msg) => write!(f, "Authentication error: {}", msg),
            UseCaseError::BusinessLogicError(msg) => write!(f, "Business logic error: {}", msg),
            UseCaseError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl Error for UseCaseError {}

/// 用例特征，定义了用例的基本接口
pub trait UseCase<Input, Output> {
    /// 执行用例逻辑
    async fn execute(&self, input: Input) -> Result<Output, UseCaseError>;
}

/// 将数据库错误转换为用例错误
impl From<tokio_postgres::Error> for UseCaseError {
    fn from(error: tokio_postgres::Error) -> Self {
        UseCaseError::DatabaseError(error.to_string())
    }
}

/// 将序列化错误转换为用例错误
impl From<serde_json::Error> for UseCaseError {
    fn from(error: serde_json::Error) -> Self {
        UseCaseError::InternalError(format!("Serialization error: {}", error))
    }
}

/// 用例结果类型别名
pub type UseCaseResult<T> = Result<T, UseCaseError>;