use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use super::auth::{User, UserSession};

/// 认证相关业务结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    /// 用户信息
    pub user: User,
    /// 会话信息
    pub session: UserSession,
    /// 是否首次登录
    pub is_first_login: bool,
    /// 是否有待处理任务
    pub has_pending_tasks: bool,
    /// 待处理任务数量
    pub pending_task_count: u32,
    /// 用户上次登录时间
    pub last_login_at: Option<DateTime<Utc>>,
    /// 是否需要更新密码
    pub needs_password_update: bool,
    /// 账户状态标记
    pub account_flags: AccountFlags,
}

/// 登出结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogoutResult {
    /// 用户ID
    pub user_id: Uuid,
    /// 会话是否成功销毁
    pub session_destroyed: bool,
    /// 是否有未保存的数据
    pub has_unsaved_data: bool,
}

/// 账户状态标记
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountFlags {
    /// 是否为VIP用户
    pub is_vip: bool,
    /// 是否为新用户（注册未满7天）
    pub is_new_user: bool,
    /// 是否有未读通知
    pub has_unread_notifications: bool,
    /// 是否需要完善个人信息
    pub needs_profile_completion: bool,
    /// 账户安全等级（1-5）
    pub security_level: u8,
}

impl Default for AccountFlags {
    fn default() -> Self {
        Self {
            is_vip: false,
            is_new_user: false,
            has_unread_notifications: false,
            needs_profile_completion: false,
            security_level: 1,
        }
    }
}


/// 用户数据操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDataResult {
    /// 操作类型
    pub operation: UserDataOperation,
    /// 受影响的用户ID
    pub user_id: Uuid,
    /// 操作是否成功
    pub success: bool,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
    /// 返回的数据（如果有）
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserDataOperation {
    Create,
    Update,
    Delete,
    Query,
}

impl LoginResult {
    /// 创建新的登录结果
    pub fn new(user: User, session: UserSession) -> Self {
        let is_first_login = user.last_login_at.is_none();
        
        Self {
            last_login_at: user.last_login_at,
            is_first_login,
            user,
            session,
            has_pending_tasks: false,
            pending_task_count: 0,
            needs_password_update: false,
            account_flags: AccountFlags::default(),
        }
    }

    /// 设置待处理任务信息
    pub fn with_pending_tasks(mut self, count: u32) -> Self {
        self.has_pending_tasks = count > 0;
        self.pending_task_count = count;
        self
    }

    /// 设置账户标记
    pub fn with_account_flags(mut self, flags: AccountFlags) -> Self {
        self.account_flags = flags;
        self
    }

    /// 设置是否需要更新密码
    pub fn with_password_update_required(mut self, required: bool) -> Self {
        self.needs_password_update = required;
        self
    }
}

impl LogoutResult {
    /// 创建成功的登出结果
    pub fn success(user_id: Uuid) -> Self {
        Self {
            user_id,
            session_destroyed: true,
            has_unsaved_data: false,
        }
    }

    /// 创建有未保存数据的登出结果
    pub fn with_unsaved_data(user_id: Uuid) -> Self {
        Self {
            user_id,
            session_destroyed: true,
            has_unsaved_data: true,
        }
    }

    /// 创建会话销毁失败的结果
    pub fn session_destroy_failed(user_id: Uuid) -> Self {
        Self {
            user_id,
            session_destroyed: false,
            has_unsaved_data: false,
        }
    }
}

