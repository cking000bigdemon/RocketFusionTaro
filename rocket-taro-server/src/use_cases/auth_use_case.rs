use serde_json::json;
use tracing::{info, warn, error};

use crate::database::DbPool;
use crate::models::{
    auth::{LoginRequest, User, UserInfo, UserSession},
    route_command::RouteCommand,
};
use super::{UseCase, UseCaseError, UseCaseResult};

/// 认证用例，处理用户登录相关的业务逻辑
pub struct AuthUseCase {
    db_pool: DbPool,
}

impl AuthUseCase {
    pub fn new(db_pool: DbPool) -> Self {
        Self { db_pool }
    }

    /// 处理用户登录请求
    pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
        info!("Processing login request for user: {}", request.username);

        // 1. 验证用户凭据
        let user = match self.authenticate_user(&request).await? {
            Some(user) => user,
            None => {
                warn!("Login failed for user: {} - invalid credentials", request.username);
                return Ok(RouteCommand::alert(
                    "登录失败",
                    "用户名或密码错误，请重新输入",
                ));
            }
        };

        // 2. 检查用户状态
        if !user.is_active {
            warn!("Login attempt for inactive user: {}", user.username);
            return Ok(RouteCommand::alert(
                "账户已禁用",
                "您的账户已被禁用，请联系管理员",
            ));
        }

        // 3. 创建用户会话
        let _session = match self.create_session(&user).await {
            Ok(session) => session,
            Err(e) => {
                error!("Failed to create session for user {}: {}", user.username, e);
                return Ok(RouteCommand::alert(
                    "系统错误",
                    "登录过程中发生错误，请稍后重试",
                ));
            }
        };

        // 4. 更新最后登录时间
        if let Err(e) = self.update_last_login(&user).await {
            warn!("Failed to update last login time for user {}: {}", user.username, e);
        }

        // 5. 决定登录后的路由操作
        let route_command = self.determine_post_login_action(&user).await?;

        info!("Login successful for user: {}", user.username);
        Ok(route_command)
    }

    /// 验证用户凭据
    async fn authenticate_user(&self, request: &LoginRequest) -> UseCaseResult<Option<User>> {
        use crate::database::auth::authenticate_user;
        
        match authenticate_user(&self.db_pool, request).await {
            Ok(user) => Ok(user),
            Err(e) => {
                error!("Database error during authentication: {}", e);
                Err(UseCaseError::DatabaseError(e.to_string()))
            }
        }
    }

    /// 创建用户会话
    async fn create_session(&self, user: &User) -> UseCaseResult<UserSession> {
        use crate::database::auth::create_user_session;
        
        create_user_session(
            &self.db_pool,
            user.id,
            None, // user_agent 可以后续传入
            None, // ip_address 可以后续传入
        ).await.map_err(|e| {
            error!("Failed to create session: {}", e);
            UseCaseError::DatabaseError(e.to_string())
        })
    }

    /// 更新最后登录时间
    async fn update_last_login(&self, user: &User) -> UseCaseResult<()> {
        use crate::database::auth::update_last_login;
        
        update_last_login(&self.db_pool, user.id).await.map_err(|e| {
            UseCaseError::DatabaseError(e.to_string())
        })
    }

    /// 决定登录后的操作
    async fn determine_post_login_action(&self, user: &User) -> UseCaseResult<RouteCommand> {
        // 检查是否是首次登录
        if user.last_login_at.is_none() {
            info!("First login detected for user: {}", user.username);
            return Ok(RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(user.clone()))?),
                RouteCommand::toast("欢迎使用系统！"),
                RouteCommand::redirect_to("/welcome"),
            ]));
        }

        // 检查是否有待处理的任务
        if self.has_pending_tasks(user).await? {
            return Ok(RouteCommand::confirm(
                "待处理任务",
                "您有未完成的任务，是否立即处理？",
                Some(RouteCommand::redirect_to("/tasks")),
                Some(RouteCommand::redirect_to("/home")),
            ));
        }

        // 根据用户角色决定跳转页面
        let redirect_path = if user.is_admin {
            "/pages/index/index"  // 管理员也跳转到主页，可以后续添加管理功能
        } else {
            "/pages/index/index"  // 普通用户跳转到主页
        };

        // 正常登录流程
        Ok(RouteCommand::sequence(vec![
            RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(user.clone()))?),
            RouteCommand::toast("登录成功"),
            RouteCommand::redirect_to(redirect_path),
        ]))
    }

    /// 检查用户是否有待处理任务
    async fn has_pending_tasks(&self, _user: &User) -> UseCaseResult<bool> {
        // 这里可以实现具体的业务逻辑
        // 例如查询数据库中的待处理订单、审批等
        // 目前先返回 false
        Ok(false)
    }

    /// 处理用户登出
    pub async fn handle_logout(&self, session_token: &str) -> UseCaseResult<RouteCommand> {
        use crate::database::auth::logout_session;
        
        match logout_session(&self.db_pool, session_token).await {
            Ok(_) => {
                info!("User logged out successfully");
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", json!(null)),
                    RouteCommand::toast("已退出登录"),
                    RouteCommand::redirect_to("/login"),
                ]))
            }
            Err(e) => {
                warn!("Failed to logout session: {}", e);
                // 即使后端登出失败，也要清理前端状态
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", json!(null)),
                    RouteCommand::redirect_to("/login"),
                ]))
            }
        }
    }

    /// 获取当前用户信息
    pub async fn get_current_user(&self, user: User) -> UseCaseResult<RouteCommand> {
        Ok(RouteCommand::process_data(
            "user",
            serde_json::to_value(UserInfo::from(user))?,
        ))
    }
}

impl UseCase<LoginRequest, RouteCommand> for AuthUseCase {
    async fn execute(&self, input: LoginRequest) -> Result<RouteCommand, UseCaseError> {
        self.handle_login(input).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::LoginRequest;

    // 注意：这些测试需要数据库连接，在实际项目中应该使用模拟对象
    // 这里只提供测试结构的示例

    #[tokio::test]
    #[ignore] // 因为需要真实的数据库连接
    async fn test_handle_login_invalid_credentials() {
        // 这里应该创建一个测试数据库或使用模拟对象
        // let db_pool = create_test_db_pool().await;
        // let use_case = AuthUseCase::new(Arc::new(db_pool));
        
        // let request = LoginRequest {
        //     username: "nonexistent".to_string(),
        //     password: "wrong".to_string(),
        // };
        
        // let result = use_case.handle_login(request).await.unwrap();
        // match result {
        //     RouteCommand::ShowDialog { dialog_type, title, .. } => {
        //         assert_eq!(title, "登录失败");
        //         assert!(matches!(dialog_type, crate::models::route_command::DialogType::Alert));
        //     }
        //     _ => panic!("Expected ShowDialog command"),
        // }
    }
}