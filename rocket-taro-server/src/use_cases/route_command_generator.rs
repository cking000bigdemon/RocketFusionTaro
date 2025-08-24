use serde_json::json;
use tracing::{info, warn, instrument};

use crate::models::{
    route_command::RouteCommand,
    business_results::{LoginResult, LogoutResult, UserDataResult},
    auth::UserInfo,
};

/// 路由决策器，负责根据业务结果生成路由指令
pub struct RouteCommandGenerator;

impl RouteCommandGenerator {
    /// 根据登录结果生成路由指令
    #[instrument(skip_all, name = "generate_login_route_command")]
    pub fn generate_login_route_command(result: &LoginResult) -> RouteCommand {
        info!(user_id = %result.user.id, is_admin = %result.user.is_admin, "Generating login route command");

        // 首次登录处理
        if result.is_first_login {
            info!("First login detected, redirecting to welcome page");
            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
                RouteCommand::toast("欢迎使用系统！"),
                RouteCommand::redirect_to("/pages/index/index"),
            ]);
        }

        // 需要更新密码
        if result.needs_password_update {
            warn!(user_id = %result.user.id, "User needs to update password");
            return RouteCommand::confirm(
                "密码安全提醒",
                "为了账户安全，建议您更新密码",
                Some(RouteCommand::redirect_to("/pages/index/index")),
                Some(RouteCommand::redirect_to("/pages/index/index")),
            );
        }

        // 有待处理任务
        if result.has_pending_tasks {
            info!(user_id = %result.user.id, pending_tasks = %result.pending_task_count, "User has pending tasks");
            
            let message = if result.pending_task_count == 1 {
                "您有1个待处理任务".to_string()
            } else {
                format!("您有{}个待处理任务", result.pending_task_count)
            };

            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
                RouteCommand::confirm(
                    "待处理任务",
                    &format!("{}，是否立即处理？", message),
                    Some(RouteCommand::redirect_to("/pages/index/index")),
                    Some(RouteCommand::redirect_to("/pages/index/index")),
                ),
            ]);
        }

        // VIP用户特殊处理
        if result.account_flags.is_vip {
            info!(user_id = %result.user.id, "VIP user login");
            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
                RouteCommand::toast("尊敬的VIP用户，欢迎回来！"),
                RouteCommand::redirect_to("/pages/index/index"),
            ]);
        }

        // 新用户引导
        if result.account_flags.is_new_user {
            info!(user_id = %result.user.id, "New user login");
            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
                RouteCommand::toast("欢迎新用户！"),
                RouteCommand::redirect_to("/pages/index/index"),
            ]);
        }

        // 需要完善个人信息
        if result.account_flags.needs_profile_completion {
            info!(user_id = %result.user.id, "User needs to complete profile");
            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
                RouteCommand::confirm(
                    "完善个人信息",
                    "为了获得更好的体验，请完善您的个人信息",
                    Some(RouteCommand::redirect_to("/pages/index/index")),
                    Some(RouteCommand::redirect_to("/pages/index/index")),
                ),
            ]);
        }

        // 默认登录流程
        info!(user_id = %result.user.id, "Normal login flow");
        RouteCommand::sequence(vec![
            RouteCommand::process_data("user", serde_json::to_value(UserInfo::from(result.user.clone())).unwrap()),
            RouteCommand::toast("登录成功"),
            RouteCommand::redirect_to("/pages/index/index"),
        ])
    }

    /// 根据登出结果生成路由指令
    #[instrument(skip_all, name = "generate_logout_route_command")]
    pub fn generate_logout_route_command(result: &LogoutResult) -> RouteCommand {
        info!(user_id = %result.user_id, "Generating logout route command");

        if result.has_unsaved_data {
            warn!(user_id = %result.user_id, "User has unsaved data");
            return RouteCommand::confirm(
                "未保存的数据",
                "您有未保存的数据，退出登录将会丢失，是否继续？",
                Some(RouteCommand::sequence(vec![
                    RouteCommand::process_data("user", json!(null)),
                    RouteCommand::toast("已退出登录"),
                    RouteCommand::redirect_to("/pages/login/index"),
                ])),
                None, // 取消不执行任何操作
            );
        }

        if !result.session_destroyed {
            warn!(user_id = %result.user_id, "Session destroy failed, but continuing logout");
            return RouteCommand::sequence(vec![
                RouteCommand::process_data("user", json!(null)),
                RouteCommand::toast("已退出登录（部分数据清理可能失败）"),
                RouteCommand::redirect_to("/pages/login/index"),
            ]);
        }

        // 正常登出
        info!(user_id = %result.user_id, "Normal logout flow");
        RouteCommand::sequence(vec![
            RouteCommand::process_data("user", json!(null)),
            RouteCommand::toast("已退出登录"),
            RouteCommand::redirect_to("/pages/login/index"),
        ])
    }


    /// 处理一般性错误的路由指令
    #[instrument(skip_all, name = "generate_error_route_command")]
    pub fn generate_error_route_command(error_message: &str, error_code: Option<&str>) -> RouteCommand {
        warn!(error_message = %error_message, error_code = ?error_code, "Generating error route command");

        match error_code {
            Some("AUTH_INVALID_CREDENTIALS") => {
                RouteCommand::alert("登录失败", "用户名或密码错误，请重新输入")
            }
            Some("AUTH_ACCOUNT_LOCKED") => {
                RouteCommand::alert("账户已锁定", "您的账户已被锁定，请联系管理员")
            }
            Some("AUTH_SESSION_EXPIRED") => {
                RouteCommand::sequence(vec![
                    RouteCommand::alert("会话已过期", "您的会话已过期，请重新登录"),
                    RouteCommand::process_data("user", json!(null)),
                    RouteCommand::redirect_to("/pages/login/index"),
                ])
            }
            Some("NETWORK_ERROR") => {
                RouteCommand::alert("网络错误", "网络连接失败，请检查网络设置")
            }
            Some("SERVER_MAINTENANCE") => {
                RouteCommand::alert("系统维护", "系统正在维护中，请稍后重试")
            }
            _ => {
                // 通用错误处理
                RouteCommand::alert("操作失败", error_message)
            }
        }
    }

    /// 根据用户数据操作结果生成路由指令
    #[instrument(skip_all, name = "generate_user_data_route_command")]
    pub fn generate_user_data_route_command(result: &UserDataResult) -> RouteCommand {
        info!(
            user_id = %result.user_id, 
            operation = ?result.operation, 
            success = %result.success,
            "Generating user data operation route command"
        );

        if !result.success {
            let error_msg = result.error_message.as_deref().unwrap_or("操作失败");
            warn!(user_id = %result.user_id, error = %error_msg, "User data operation failed");
            return RouteCommand::alert("操作失败", error_msg);
        }

        match result.operation {
            crate::models::business_results::UserDataOperation::Create => {
                RouteCommand::sequence(vec![
                    RouteCommand::toast("创建成功"),
                    // 刷新数据列表
                    RouteCommand::redirect_to("/pages/index/index"),
                ])
            }
            crate::models::business_results::UserDataOperation::Update => {
                RouteCommand::toast("更新成功")
            }
            crate::models::business_results::UserDataOperation::Delete => {
                RouteCommand::sequence(vec![
                    RouteCommand::toast("删除成功"),
                    // 刷新数据列表
                    RouteCommand::redirect_to("/pages/index/index"),
                ])
            }
            crate::models::business_results::UserDataOperation::Query => {
                // 查询操作通常不需要特殊的路由指令
                if let Some(data) = &result.data {
                    RouteCommand::process_data("queryResult", data.clone())
                } else {
                    RouteCommand::toast("查询完成")
                }
            }
        }
    }
}