use serde_json::json;
use tracing::{info, warn, error, instrument};

use crate::database::DbPool;
use crate::models::{
    auth::{LoginRequest, RegisterRequest, User, UserInfo, UserSession},
    route_command::RouteCommand,
    business_results::{LoginResult, LogoutResult, AccountFlags},
};
use crate::config::{RouteConfig, Platform};
use super::{UseCase, UseCaseError, UseCaseResult, route_command_generator::RouteCommandGenerator};

/// 认证用例，处理用户登录相关的业务逻辑
pub struct AuthUseCase {
    db_pool: DbPool,
    route_config: RouteConfig,
}

impl AuthUseCase {
    pub fn new(db_pool: DbPool, route_config: RouteConfig) -> Self {
        Self { db_pool, route_config }
    }

    /// 处理用户登录请求 - 纯业务逻辑
    #[instrument(skip_all, name = "execute_login")]
    pub async fn execute_login(&self, request: LoginRequest) -> UseCaseResult<LoginResult> {
        info!("Processing login request for user: {}", request.username);

        // 1. 验证用户凭据
        let user = match self.authenticate_user(&request).await? {
            Some(user) => user,
            None => {
                warn!("Login failed for user: {} - invalid credentials", request.username);
                return Err(UseCaseError::AuthenticationError("用户名或密码错误".to_string()));
            }
        };

        // 2. 检查用户状态
        if !user.is_active {
            warn!("Login attempt for inactive user: {}", user.username);
            return Err(UseCaseError::AuthenticationError("账户已被禁用".to_string()));
        }

        // 3. 创建用户会话
        let session = self.create_session(&user).await.map_err(|e| {
            error!("Failed to create session for user {}: {}", user.username, e);
            UseCaseError::InternalError("会话创建失败".to_string())
        })?;

        // 4. 更新最后登录时间
        if let Err(e) = self.update_last_login(&user).await {
            warn!("Failed to update last login time for user {}: {}", user.username, e);
        }

        // 5. 构建业务结果
        let mut login_result = LoginResult::new(user.clone(), session);
        
        // 检查待处理任务
        let pending_tasks = self.get_pending_tasks_count(&user).await.unwrap_or(0);
        login_result = login_result.with_pending_tasks(pending_tasks);
        
        // 设置账户标记
        let account_flags = self.build_account_flags(&user).await?;
        login_result = login_result.with_account_flags(account_flags);
        
        // 检查是否需要更新密码
        let needs_password_update = self.check_password_update_required(&user).await.unwrap_or(false);
        login_result = login_result.with_password_update_required(needs_password_update);

        info!("Login successful for user: {}", user.username);
        Ok(login_result)
    }

    /// 处理用户登录请求 - 包含路由决策（保留向后兼容）
    pub async fn handle_login(&self, request: LoginRequest, platform: Platform) -> UseCaseResult<RouteCommand> {
        match self.execute_login(request).await {
            Ok(login_result) => {
                Ok(RouteCommandGenerator::generate_login_route_command(&login_result, &self.route_config, platform))
            }
            Err(e) => {
                let error_code = match &e {
                    UseCaseError::AuthenticationError(_) => Some("AUTH_INVALID_CREDENTIALS"),
                    UseCaseError::DatabaseError(_) => Some("DATABASE_ERROR"),
                    _ => None,
                };
                Ok(RouteCommandGenerator::generate_error_route_command(&e.to_string(), error_code, &self.route_config, platform))
            }
        }
    }

    /// 验证用户凭据
    #[instrument(skip_all, name = "authenticate_user")]
    async fn authenticate_user(&self, request: &LoginRequest) -> UseCaseResult<Option<User>> {
        use crate::database::auth::authenticate_user;
        
        info!(username = %request.username, "Authenticating user credentials");
        
        match authenticate_user(&self.db_pool, request).await {
            Ok(Some(user)) => {
                info!(user_id = %user.id, username = %user.username, "User authentication successful");
                Ok(Some(user))
            }
            Ok(None) => {
                warn!(username = %request.username, "User authentication failed: invalid credentials");
                Ok(None)
            }
            Err(e) => {
                error!(username = %request.username, error = %e, "Database error during authentication");
                Err(UseCaseError::DatabaseError(e.to_string()))
            }
        }
    }

    /// 创建用户会话
    #[instrument(skip_all, name = "create_session")]
    async fn create_session(&self, user: &User) -> UseCaseResult<UserSession> {
        use crate::database::auth::create_user_session;
        
        info!(user_id = %user.id, username = %user.username, "Creating user session");
        
        create_user_session(
            &self.db_pool,
            user.id,
            None, // user_agent 可以后续传入
            None, // ip_address 可以后续传入
        ).await.map_err(|e| {
            error!(user_id = %user.id, error = %e, "Failed to create session");
            UseCaseError::DatabaseError(e.to_string())
        }).map(|session| {
            info!(user_id = %user.id, session_id = %session.id, "Session created successfully");
            session
        })
    }

    /// 更新最后登录时间
    #[instrument(skip_all, name = "update_last_login")]
    async fn update_last_login(&self, user: &User) -> UseCaseResult<()> {
        use crate::database::auth::update_last_login;
        
        info!(user_id = %user.id, "Updating last login time");
        
        update_last_login(&self.db_pool, user.id).await.map_err(|e| {
            error!(user_id = %user.id, error = %e, "Failed to update last login time");
            UseCaseError::DatabaseError(e.to_string())
        }).map(|_| {
            info!(user_id = %user.id, "Last login time updated successfully");
        })
    }

    /// 构建账户标记
    #[instrument(skip_all, name = "build_account_flags")]
    async fn build_account_flags(&self, user: &User) -> UseCaseResult<AccountFlags> {
        info!(user_id = %user.id, "Building account flags for user");
        // 这里可以根据实际业务逻辑来设置各种标记
        // 目前使用简化的逻辑
        
        // 根据is_admin判断VIP状态（简化逻辑）
        let is_vip = user.is_admin;
        
        // 检查是否为新用户（注册7天内）
        let is_new_user = {
            let now = chrono::Utc::now();
            let seven_days_ago = now - chrono::Duration::days(7);
            user.created_at > seven_days_ago
        };
        
        // 检查是否有未读通知 - 这里可以查询通知表
        let has_unread_notifications = false; // 简化实现
        
        // 检查是否需要完善个人信息
        let needs_profile_completion = user.email.is_empty() || user.full_name.is_none();
        
        // 简单的安全等级计算
        let mut security_level = 1;
        if user.full_name.is_some() { security_level += 1; }
        if !user.email.is_empty() { security_level += 1; }
        // 可以添加其他安全因子的判断
        security_level = security_level.min(5);
        
        let flags = AccountFlags {
            is_vip,
            is_new_user,
            has_unread_notifications,
            needs_profile_completion,
            security_level,
        };
        
        info!(
            user_id = %user.id, 
            is_vip = %flags.is_vip,
            is_new_user = %flags.is_new_user,
            needs_profile_completion = %flags.needs_profile_completion,
            security_level = %flags.security_level,
            "Account flags built successfully"
        );
        
        Ok(flags)
    }

    /// 获取用户待处理任务数量
    #[instrument(skip_all, name = "get_pending_tasks_count")]
    async fn get_pending_tasks_count(&self, user: &User) -> UseCaseResult<u32> {
        info!(user_id = %user.id, "Checking pending tasks count");
        
        // 这里可以实现具体的业务逻辑
        // 例如查询数据库中的待处理订单、审批等
        let count = 0; // 目前先返回 0
        
        info!(user_id = %user.id, pending_tasks = %count, "Pending tasks count retrieved");
        Ok(count)
    }
    
    /// 检查用户是否需要更新密码
    #[instrument(skip_all, name = "check_password_update_required")]
    async fn check_password_update_required(&self, user: &User) -> UseCaseResult<bool> {
        info!(user_id = %user.id, username = %user.username, "Checking password update requirement");
        
        // 检查密码是否过期或者是默认密码
        // 这里可以实现具体的密码策略逻辑
        
        // 如果是首次登录且使用默认密码，建议更新
        let needs_update = user.last_login_at.is_none() && user.username == "admin";
        
        if needs_update {
            info!(user_id = %user.id, "Password update required: first-time admin login");
        } else {
            info!(user_id = %user.id, "Password update not required");
        }
        
        Ok(needs_update)
    }

    /// 执行用户登出 - 纯业务逻辑
    #[instrument(skip_all, name = "execute_logout")]
    pub async fn execute_logout(&self, session_token: &str, user_id: uuid::Uuid) -> UseCaseResult<LogoutResult> {
        use crate::database::auth::logout_session;
        
        info!(user_id = %user_id, "Processing logout request");
        
        // 检查是否有未保存的数据
        let has_unsaved_data = self.check_unsaved_data(user_id).await.unwrap_or(false);
        
        // 尝试销毁会话
        let session_destroyed = match logout_session(&self.db_pool, session_token).await {
            Ok(_) => {
                info!(user_id = %user_id, "Session destroyed successfully");
                true
            }
            Err(e) => {
                warn!(user_id = %user_id, error = %e, "Failed to destroy session");
                false
            }
        };
        
        Ok(LogoutResult {
            user_id,
            session_destroyed,
            has_unsaved_data,
        })
    }
    
    /// 处理用户登出 - 包含路由决策（保留向后兼容）
    pub async fn handle_logout(&self, session_token: &str, platform: Platform) -> UseCaseResult<RouteCommand> {
        // 这里需要获取用户ID，简化处理使用固定值
        // 在实际实现中应该从session_token解析或查询获得user_id
        let user_id = uuid::Uuid::new_v4(); // 简化处理
        
        match self.execute_logout(session_token, user_id).await {
            Ok(logout_result) => {
                Ok(RouteCommandGenerator::generate_logout_route_command(&logout_result, &self.route_config, platform))
            }
            Err(e) => {
                warn!(error = %e, "Logout failed, but clearing client state");
                let login_route = self.route_config.get_route("auth.login", platform)
                    .unwrap_or_else(|| "/pages/login/login".to_string());
                // 即使后端登出失败，也要清理前端状态
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", json!(null)),
                    RouteCommand::redirect_to(&login_route),
                ]))
            }
        }
    }
    
    /// 检查用户是否有未保存的数据
    #[instrument(skip_all, name = "check_unsaved_data")]
    async fn check_unsaved_data(&self, user_id: uuid::Uuid) -> UseCaseResult<bool> {
        info!(user_id = %user_id, "Checking for unsaved data");
        
        // 这里可以实现检查用户是否有未保存的草稿、表单等
        let has_unsaved = false; // 目前简化处理
        
        info!(user_id = %user_id, has_unsaved_data = %has_unsaved, "Unsaved data check completed");
        Ok(has_unsaved)
    }

    /// 处理用户注册请求
    #[instrument(skip_all, name = "handle_register")]
    pub async fn handle_register(&self, request: RegisterRequest, platform: Platform) -> UseCaseResult<RouteCommand> {
        info!("Processing registration request for user: {}", request.username);

        // 1. 验证密码确认
        if request.password != request.confirm_password {
            warn!("Password confirmation mismatch for user: {}", request.username);
            return Ok(RouteCommand::alert("注册失败", "两次输入的密码不一致，请重新输入"));
        }

        // 2. 验证账号格式
        if request.username.len() < 3 || request.username.len() > 30 {
            warn!("Invalid account length for user: {}", request.username);
            return Ok(RouteCommand::alert("注册失败", "账号长度必须在3-30个字符之间"));
        }

        // 3. 验证密码强度
        if request.password.len() < 6 || request.password.len() > 30 {
            warn!("Invalid password length for user: {}", request.username);
            return Ok(RouteCommand::alert("注册失败", "密码长度必须在6-30个字符之间"));
        }

        // 4. 检查用户名是否已存在
        match self.check_username_exists(&request.username).await {
            Ok(true) => {
                warn!("Username already exists: {}", request.username);
                return Ok(RouteCommand::alert("注册失败", "该账号已存在，请更换其他账号"));
            }
            Ok(false) => {
                info!("Username available: {}", request.username);
            }
            Err(e) => {
                error!("Failed to check username existence: {}", e);
                return Ok(RouteCommand::alert("注册失败", "系统错误，请稍后重试"));
            }
        }

        // 5. 创建用户
        let user = match self.create_user(&request).await {
            Ok(user) => {
                info!("User registration successful: {}", user.username);
                user
            }
            Err(e) => {
                error!("Failed to create user {}: {}", request.username, e);
                return Ok(RouteCommand::alert("注册失败", "创建账号失败，请稍后重试"));
            }
        };

        // 6. 自动登录新用户（创建会话）
        match self.create_session(&user).await {
            Ok(session) => {
                info!("Auto-login session created for new user: {}", user.username);
                
                // 7. 构建登录结果并生成路由指令
                let mut login_result = LoginResult::new(user.clone(), session);
                let account_flags = self.build_account_flags(&user).await.unwrap_or_default();
                login_result = login_result.with_account_flags(account_flags);
                
                let home_route = self.route_config.get_route("home.main", platform)
                    .unwrap_or_else(|| "/pages/home/home".to_string());
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(user))?),
                    RouteCommand::navigate_to(&home_route),
                ]))
            }
            Err(e) => {
                warn!("Failed to create session for new user, but registration successful: {}", e);
                let login_route = self.route_config.get_route("auth.login", platform)
                    .unwrap_or_else(|| "/pages/login/login".to_string());
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::alert("注册成功", "账号创建成功，请重新登录"),
                    RouteCommand::navigate_to(&login_route),
                ]))
            }
        }
    }

    /// 检查用户名是否已存在
    #[instrument(skip_all, name = "check_username_exists")]
    async fn check_username_exists(&self, username: &str) -> UseCaseResult<bool> {
        use crate::database::auth::check_username_exists;
        
        info!(username = %username, "Checking username existence");
        
        match check_username_exists(&self.db_pool, username).await {
            Ok(exists) => {
                info!(username = %username, exists = %exists, "Username existence check completed");
                Ok(exists)
            }
            Err(e) => {
                error!(username = %username, error = %e, "Database error during username check");
                Err(UseCaseError::DatabaseError(e.to_string()))
            }
        }
    }

    /// 创建新用户
    #[instrument(skip_all, name = "create_user")]
    async fn create_user(&self, request: &RegisterRequest) -> UseCaseResult<User> {
        use crate::database::auth::create_user;
        
        info!(username = %request.username, "Creating new user");
        
        match create_user(&self.db_pool, request).await {
            Ok(user) => {
                info!(user_id = %user.id, username = %user.username, "User created successfully");
                Ok(user)
            }
            Err(e) => {
                error!(username = %request.username, error = %e, "Database error during user creation");
                Err(UseCaseError::DatabaseError(e.to_string()))
            }
        }
    }

    /// 处理游客登录请求
    pub async fn handle_guest_login(&self, platform: Platform) -> UseCaseResult<RouteCommand> {
        info!("Processing guest login request");

        let guest_user = match self.create_guest_user().await {
            Ok(user) => {
                info!("Guest user created successfully: {}", user.username);
                user
            }
            Err(e) => {
                error!("Failed to create guest user: {}", e);
                return Ok(RouteCommand::alert("游客登录失败", "创建游客账号失败，请稍后重试"));
            }
        };

        match self.create_session(&guest_user).await {
            Ok(session) => {
                info!("Guest login session created: {}", guest_user.username);
                
                let mut login_result = LoginResult::new(guest_user.clone(), session);
                let account_flags = self.build_account_flags(&guest_user).await.unwrap_or_default();
                login_result = login_result.with_account_flags(account_flags);
                
                let home_route = self.route_config.get_route("home.main", platform)
                    .unwrap_or_else(|| "/pages/home/home".to_string());
                Ok(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(guest_user))?),
                    RouteCommand::navigate_to(&home_route),
                ]))
            }
            Err(e) => {
                warn!("Failed to create session for guest user: {}", e);
                Ok(RouteCommand::alert("游客登录失败", "创建会话失败，请稍后重试"))
            }
        }
    }

    /// 创建游客用户
    async fn create_guest_user(&self) -> UseCaseResult<User> {
        use crate::database::auth::create_guest_user;
        
        info!("Creating new guest user");
        
        create_guest_user(&self.db_pool).await.map_err(|e| {
            error!("Database error during guest user creation: {}", e);
            UseCaseError::DatabaseError(e.to_string())
        })
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
        self.handle_login(input, Platform::default()).await
    }
}

#[cfg(test)]
mod tests {

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