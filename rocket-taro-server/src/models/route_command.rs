use serde::{Deserialize, Serialize};

/// 路由指令版本控制常量
pub const ROUTE_COMMAND_VERSION: u32 = 2;

/// 默认版本号函数
fn default_version() -> u32 {
    ROUTE_COMMAND_VERSION
}

/// 版本化的路由指令包装器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionedRouteCommand {
    /// 指令版本号，用于兼容性控制
    #[serde(default = "default_version")]
    pub version: u32,
    /// 实际的路由指令
    #[serde(flatten)]
    pub command: RouteCommand,
    /// 执行失败时的回退指令（可选）
    pub fallback: Option<Box<VersionedRouteCommand>>,
    /// 指令元数据
    #[serde(default)]
    pub metadata: RouteCommandMetadata,
}

/// 路由指令元数据
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RouteCommandMetadata {
    /// 指令ID，用于追踪和调试
    pub id: Option<String>,
    /// 指令描述
    pub description: Option<String>,
    /// 是否允许重试
    pub retryable: bool,
    /// 超时时间（毫秒）
    pub timeout_ms: Option<u64>,
    /// 优先级（1-10，数字越大优先级越高）
    pub priority: u8,
}

/// 路由指令枚举，定义了前端可以执行的所有操作类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    /// 页面导航
    NavigateTo {
        path: String,
        params: Option<serde_json::Value>,
        replace: Option<bool>,
        /// 导航失败时的回退路径
        fallback_path: Option<String>,
    },
    
    /// 显示对话框
    ShowDialog {
        dialog_type: DialogType,
        title: String,
        content: String,
        actions: Vec<DialogAction>,
    },
    
    /// 处理数据（更新前端状态）
    ProcessData {
        data_type: String,
        data: serde_json::Value,
        merge: Option<bool>,
    },
    
    /// 组合指令（按顺序执行）
    Sequence {
        commands: Vec<RouteCommand>,
        /// 是否在遇到错误时停止执行
        stop_on_error: Option<bool>,
    },
    
    /// 条件指令（根据前端状态决定执行哪个指令）
    Conditional {
        condition: String,
        if_true: Box<RouteCommand>,
        if_false: Option<Box<RouteCommand>>,
    },
    
    /// 延迟执行指令
    Delay {
        duration_ms: u64,
        command: Box<RouteCommand>,
    },
    
    /// 并行执行指令
    Parallel {
        commands: Vec<RouteCommand>,
        /// 是否等待所有指令完成
        wait_for_all: bool,
    },
    
    /// 重试指令
    Retry {
        command: Box<RouteCommand>,
        max_attempts: u32,
        delay_ms: u64,
    },
}

/// 对话框类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DialogType {
    Alert,
    Confirm,
    Toast,
}

/// 对话框操作按钮
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogAction {
    pub text: String,
    pub action: Option<RouteCommand>,
}

/// 数据类型枚举，用于ProcessData指令
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataType {
    #[serde(rename = "user")]
    User,
    #[serde(rename = "userList")]
    UserList,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "cache")]
    Cache,
}

impl VersionedRouteCommand {
    /// 创建新的版本化路由指令
    pub fn new(command: RouteCommand) -> Self {
        Self {
            version: ROUTE_COMMAND_VERSION,
            command,
            fallback: None,
            metadata: RouteCommandMetadata::default(),
        }
    }
    
    /// 创建带有回退指令的版本化路由指令
    pub fn with_fallback(command: RouteCommand, fallback: RouteCommand) -> Self {
        Self {
            version: ROUTE_COMMAND_VERSION,
            command,
            fallback: Some(Box::new(Self::new(fallback))),
            metadata: RouteCommandMetadata::default(),
        }
    }
    
    /// 创建带有元数据的版本化路由指令
    pub fn with_metadata(command: RouteCommand, metadata: RouteCommandMetadata) -> Self {
        Self {
            version: ROUTE_COMMAND_VERSION,
            command,
            fallback: None,
            metadata,
        }
    }
    
    /// 设置回退指令
    pub fn set_fallback(mut self, fallback: RouteCommand) -> Self {
        self.fallback = Some(Box::new(Self::new(fallback)));
        self
    }
    
    /// 设置元数据
    pub fn set_metadata(mut self, metadata: RouteCommandMetadata) -> Self {
        self.metadata = metadata;
        self
    }
    
    /// 检查版本兼容性
    pub fn is_compatible(&self, client_version: u32) -> bool {
        // 简单的版本兼容性检查：主版本号必须匹配
        self.version / 100 == client_version / 100
    }
}

impl RouteCommand {
    /// 创建简单的页面导航指令
    pub fn navigate_to(path: &str) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: None,
            replace: None,
            fallback_path: None,
        }
    }
    
    /// 创建带参数的页面导航指令
    pub fn navigate_to_with_params(path: &str, params: serde_json::Value) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: Some(params),
            replace: None,
            fallback_path: None,
        }
    }
    
    /// 创建带回退路径的导航指令
    pub fn navigate_to_with_fallback(path: &str, fallback_path: &str) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: None,
            replace: None,
            fallback_path: Some(fallback_path.to_string()),
        }
    }
    
    /// 创建替换当前页面的导航指令
    pub fn redirect_to(path: &str) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: None,
            replace: Some(true),
            fallback_path: None,
        }
    }
    
    /// 创建警告对话框指令
    pub fn alert(title: &str, content: &str) -> Self {
        Self::ShowDialog {
            dialog_type: DialogType::Alert,
            title: title.to_string(),
            content: content.to_string(),
            actions: vec![],
        }
    }
    
    /// 创建轻提示指令
    pub fn toast(message: &str) -> Self {
        Self::ShowDialog {
            dialog_type: DialogType::Toast,
            title: "".to_string(),
            content: message.to_string(),
            actions: vec![],
        }
    }
    
    /// 创建确认对话框指令
    pub fn confirm(
        title: &str, 
        content: &str, 
        confirm_action: Option<RouteCommand>,
        cancel_action: Option<RouteCommand>,
    ) -> Self {
        Self::ShowDialog {
            dialog_type: DialogType::Confirm,
            title: title.to_string(),
            content: content.to_string(),
            actions: vec![
                DialogAction {
                    text: "取消".to_string(),
                    action: cancel_action,
                },
                DialogAction {
                    text: "确定".to_string(),
                    action: confirm_action,
                },
            ],
        }
    }
    
    /// 创建数据处理指令
    pub fn process_data(data_type: &str, data: serde_json::Value) -> Self {
        Self::ProcessData {
            data_type: data_type.to_string(),
            data,
            merge: Some(false),
        }
    }
    
    /// 创建数据合并指令
    pub fn merge_data(data_type: &str, data: serde_json::Value) -> Self {
        Self::ProcessData {
            data_type: data_type.to_string(),
            data,
            merge: Some(true),
        }
    }
    
    /// 创建序列指令
    pub fn sequence(commands: Vec<RouteCommand>) -> Self {
        Self::Sequence { 
            commands,
            stop_on_error: Some(true),
        }
    }
    
    /// 创建不会因错误停止的序列指令
    pub fn sequence_continue_on_error(commands: Vec<RouteCommand>) -> Self {
        Self::Sequence { 
            commands,
            stop_on_error: Some(false),
        }
    }
    
    /// 创建延迟执行指令
    pub fn delay(duration_ms: u64, command: RouteCommand) -> Self {
        Self::Delay {
            duration_ms,
            command: Box::new(command),
        }
    }
    
    /// 创建并行执行指令
    pub fn parallel(commands: Vec<RouteCommand>) -> Self {
        Self::Parallel {
            commands,
            wait_for_all: true,
        }
    }
    
    /// 创建不等待所有完成的并行指令
    pub fn parallel_fire_and_forget(commands: Vec<RouteCommand>) -> Self {
        Self::Parallel {
            commands,
            wait_for_all: false,
        }
    }
    
    /// 创建重试指令
    pub fn retry(command: RouteCommand, max_attempts: u32, delay_ms: u64) -> Self {
        Self::Retry {
            command: Box::new(command),
            max_attempts,
            delay_ms,
        }
    }
    
    /// 包装为版本化指令
    pub fn versioned(self) -> VersionedRouteCommand {
        VersionedRouteCommand::new(self)
    }
    
    /// 包装为带回退的版本化指令
    pub fn versioned_with_fallback(self, fallback: RouteCommand) -> VersionedRouteCommand {
        VersionedRouteCommand::with_fallback(self, fallback)
    }
}

impl RouteCommandMetadata {
    /// 创建带ID的元数据
    pub fn with_id(id: &str) -> Self {
        Self {
            id: Some(id.to_string()),
            description: None,
            retryable: false,
            timeout_ms: None,
            priority: 5,
        }
    }
    
    /// 创建可重试的元数据
    pub fn retryable(id: &str, timeout_ms: u64) -> Self {
        Self {
            id: Some(id.to_string()),
            description: None,
            retryable: true,
            timeout_ms: Some(timeout_ms),
            priority: 5,
        }
    }
    
    /// 设置优先级
    pub fn with_priority(mut self, priority: u8) -> Self {
        self.priority = priority.min(10).max(1);
        self
    }
    
    /// 设置描述
    pub fn with_description(mut self, description: &str) -> Self {
        self.description = Some(description.to_string());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_route_command_serialization() {
        let command = RouteCommand::navigate_to("/home");
        let json_str = serde_json::to_string(&command).unwrap();
        let deserialized: RouteCommand = serde_json::from_str(&json_str).unwrap();
        
        match deserialized {
            RouteCommand::NavigateTo { path, .. } => assert_eq!(path, "/home"),
            _ => panic!("Expected NavigateTo command"),
        }
    }

    #[test]
    fn test_versioned_route_command() {
        let command = RouteCommand::navigate_to("/home");
        let versioned = VersionedRouteCommand::new(command);
        
        assert_eq!(versioned.version, ROUTE_COMMAND_VERSION);
        assert!(versioned.is_compatible(ROUTE_COMMAND_VERSION));
        
        let json_str = serde_json::to_string(&versioned).unwrap();
        let deserialized: VersionedRouteCommand = serde_json::from_str(&json_str).unwrap();
        
        match deserialized.command {
            RouteCommand::NavigateTo { path, .. } => assert_eq!(path, "/home"),
            _ => panic!("Expected NavigateTo command"),
        }
    }

    #[test]
    fn test_fallback_command() {
        let primary = RouteCommand::navigate_to("/primary");
        let fallback = RouteCommand::navigate_to("/fallback");
        let versioned = VersionedRouteCommand::with_fallback(primary, fallback);
        
        assert!(versioned.fallback.is_some());
        match &versioned.fallback.as_ref().unwrap().command {
            RouteCommand::NavigateTo { path, .. } => assert_eq!(path, "/fallback"),
            _ => panic!("Expected NavigateTo fallback command"),
        }
    }

    #[test]
    fn test_sequence_command() {
        let command = RouteCommand::sequence(vec![
            RouteCommand::process_data("user", json!({"id": 1})),
            RouteCommand::navigate_to("/dashboard"),
        ]);
        
        match command {
            RouteCommand::Sequence { commands, stop_on_error } => {
                assert_eq!(commands.len(), 2);
                assert_eq!(stop_on_error, Some(true));
            },
            _ => panic!("Expected Sequence command"),
        }
    }

    #[test]
    fn test_dialog_command() {
        let command = RouteCommand::alert("错误", "操作失败");
        
        match command {
            RouteCommand::ShowDialog { dialog_type, title, content, .. } => {
                assert_eq!(title, "错误");
                assert_eq!(content, "操作失败");
                assert!(matches!(dialog_type, DialogType::Alert));
            },
            _ => panic!("Expected ShowDialog command"),
        }
    }
    
    #[test]
    fn test_version_compatibility() {
        let v200 = VersionedRouteCommand { 
            version: 200, 
            command: RouteCommand::navigate_to("/test"),
            fallback: None,
            metadata: RouteCommandMetadata::default(),
        };
        let v300 = VersionedRouteCommand { 
            version: 300, 
            command: RouteCommand::navigate_to("/test"),
            fallback: None,
            metadata: RouteCommandMetadata::default(),
        };
        
        assert!(v200.is_compatible(201)); // Same major version
        assert!(!v200.is_compatible(300)); // Different major version
        assert!(!v300.is_compatible(200)); // Different major version
    }
    
    #[test]
    fn test_retry_command() {
        let retry_cmd = RouteCommand::retry(
            RouteCommand::navigate_to("/api/data"),
            3,
            1000
        );
        
        match retry_cmd {
            RouteCommand::Retry { max_attempts, delay_ms, .. } => {
                assert_eq!(max_attempts, 3);
                assert_eq!(delay_ms, 1000);
            },
            _ => panic!("Expected Retry command"),
        }
    }
    
    #[test]
    fn test_parallel_command() {
        let parallel_cmd = RouteCommand::parallel(vec![
            RouteCommand::process_data("data1", json!({"id": 1})),
            RouteCommand::process_data("data2", json!({"id": 2})),
        ]);
        
        match parallel_cmd {
            RouteCommand::Parallel { commands, wait_for_all } => {
                assert_eq!(commands.len(), 2);
                assert_eq!(wait_for_all, true);
            },
            _ => panic!("Expected Parallel command"),
        }
    }

    #[test]
    fn test_metadata() {
        let metadata = RouteCommandMetadata::with_id("test_command")
            .with_description("Test command description")
            .with_priority(8);
        
        assert_eq!(metadata.id, Some("test_command".to_string()));
        assert_eq!(metadata.description, Some("Test command description".to_string()));
        assert_eq!(metadata.priority, 8);
        assert_eq!(metadata.retryable, false);
    }
}