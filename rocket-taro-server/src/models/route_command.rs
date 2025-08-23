use serde::{Deserialize, Serialize};

/// 路由指令枚举，定义了前端可以执行的所有操作类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    /// 页面导航
    NavigateTo {
        path: String,
        params: Option<serde_json::Value>,
        replace: Option<bool>,
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
    },
    
    /// 请求支付
    RequestPayment {
        payment_info: PaymentInfo,
        callback_url: String,
    },
    
    /// 条件指令（根据前端状态决定执行哪个指令）
    Conditional {
        condition: String,
        if_true: Box<RouteCommand>,
        if_false: Option<Box<RouteCommand>>,
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

/// 支付信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentInfo {
    pub order_id: String,
    pub amount: i64,
    pub currency: String,
    pub description: String,
    pub payment_method: PaymentMethod,
}

/// 支付方式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaymentMethod {
    #[serde(rename = "wechat")]
    WeChat,
    #[serde(rename = "alipay")]
    Alipay,
    #[serde(rename = "card")]
    Card,
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

impl RouteCommand {
    /// 创建简单的页面导航指令
    pub fn navigate_to(path: &str) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: None,
            replace: None,
        }
    }
    
    /// 创建带参数的页面导航指令
    pub fn navigate_to_with_params(path: &str, params: serde_json::Value) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: Some(params),
            replace: None,
        }
    }
    
    /// 创建替换当前页面的导航指令
    pub fn redirect_to(path: &str) -> Self {
        Self::NavigateTo {
            path: path.to_string(),
            params: None,
            replace: Some(true),
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
        Self::Sequence { commands }
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
    fn test_sequence_command() {
        let command = RouteCommand::sequence(vec![
            RouteCommand::process_data("user", json!({"id": 1})),
            RouteCommand::navigate_to("/dashboard"),
        ]);
        
        match command {
            RouteCommand::Sequence { commands } => assert_eq!(commands.len(), 2),
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
}