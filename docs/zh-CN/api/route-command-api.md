# 路由指令API规范

## 概述

路由指令API是后端驱动路由系统的核心协议，它定义了后端如何向前端发送指令以控制用户界面的行为。本文档详细描述了所有支持的路由指令类型、数据格式和使用方法。

## API响应格式

### 基础响应结构

所有API响应都遵循统一的格式：

```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "route_command": {
    "type": "CommandType",
    "payload": { /* 指令数据 */ }
  }
}
```

**字段说明**：
- `code`: HTTP状态码，200表示成功
- `message`: 响应消息，通常为"success"或错误描述
- `data`: 业务数据，可为null
- `route_command`: 路由指令对象，可为null

### 响应类型

#### 1. 仅数据响应
```json
{
  "code": 200,
  "message": "success",
  "data": { "user_id": 123, "username": "admin" },
  "route_command": null
}
```

#### 2. 仅指令响应
```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "route_command": {
    "type": "NavigateTo",
    "payload": { "path": "/home" }
  }
}
```

#### 3. 数据+指令响应
```json
{
  "code": 200,
  "message": "success",
  "data": { "session_token": "abc123" },
  "route_command": {
    "type": "NavigateTo",
    "payload": { "path": "/dashboard" }
  }
}
```

## 路由指令类型

### 1. NavigateTo - 页面导航

用于控制前端页面跳转。

#### 数据结构
```typescript
interface NavigateToPayload {
  path: string                        // 目标页面路径
  params?: Record<string, any>        // URL查询参数
  replace?: boolean                   // 是否替换当前页面历史记录
}
```

#### 示例

**基本导航**：
```json
{
  "type": "NavigateTo",
  "payload": {
    "path": "/home"
  }
}
```

**带参数导航**：
```json
{
  "type": "NavigateTo",
  "payload": {
    "path": "/user/profile",
    "params": {
      "user_id": 123,
      "tab": "settings"
    }
  }
}
```

**替换当前页面**：
```json
{
  "type": "NavigateTo",
  "payload": {
    "path": "/login",
    "replace": true
  }
}
```

#### 前端实现
```javascript
// 生成的URL: /user/profile?user_id=123&tab=settings
async handleNavigateTo({ path, params, replace }) {
  let url = path
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }
  
  if (replace) {
    await Taro.redirectTo({ url })
  } else {
    await Taro.navigateTo({ url })
  }
}
```

### 2. ShowDialog - 显示对话框

用于控制前端显示各种类型的对话框。

#### 数据结构
```typescript
interface ShowDialogPayload {
  dialog_type: 'Alert' | 'Confirm' | 'Toast'
  title: string
  content: string
  actions?: DialogAction[]
}

interface DialogAction {
  text: string
  action?: RouteCommand
}
```

#### 示例

**警告对话框**：
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Alert",
    "title": "操作失败",
    "content": "请检查网络连接后重试",
    "actions": []
  }
}
```

**确认对话框**：
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Confirm",
    "title": "确认删除",
    "content": "此操作不可撤销，确定要删除吗？",
    "actions": [
      {
        "text": "取消",
        "action": null
      },
      {
        "text": "确认删除",
        "action": {
          "type": "NavigateTo",
          "payload": { "path": "/deleted-success" }
        }
      }
    ]
  }
}
```

**轻提示**：
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Toast",
    "title": "",
    "content": "保存成功",
    "actions": []
  }
}
```

#### 前端实现
```javascript
async handleShowDialog({ dialog_type, title, content, actions }) {
  switch (dialog_type) {
    case 'Alert':
      await Taro.showModal({
        title,
        content,
        showCancel: false
      })
      break
      
    case 'Confirm':
      const result = await Taro.showModal({
        title,
        content,
        cancelText: actions[0]?.text || '取消',
        confirmText: actions[1]?.text || '确定'
      })
      
      if (result.confirm && actions[1]?.action) {
        await this.execute(actions[1].action)
      }
      break
      
    case 'Toast':
      Taro.showToast({
        title: content,
        icon: 'none',
        duration: 2000
      })
      break
  }
}
```

### 3. ProcessData - 处理数据

用于更新前端状态管理中的数据。

#### 数据结构
```typescript
interface ProcessDataPayload {
  data_type: string                   // 数据类型标识
  data: any                          // 数据内容
  merge?: boolean                    // 是否合并到现有数据
}
```

#### 示例

**设置用户信息**：
```json
{
  "type": "ProcessData",
  "payload": {
    "data_type": "user",
    "data": {
      "id": 123,
      "username": "admin",
      "email": "admin@example.com",
      "is_admin": true
    },
    "merge": false
  }
}
```

**更新用户部分信息**：
```json
{
  "type": "ProcessData",
  "payload": {
    "data_type": "user",
    "data": {
      "last_login": "2024-01-01T12:00:00Z"
    },
    "merge": true
  }
}
```

**设置列表数据**：
```json
{
  "type": "ProcessData",
  "payload": {
    "data_type": "userList",
    "data": [
      { "id": 1, "name": "张三" },
      { "id": 2, "name": "李四" }
    ]
  }
}
```

#### 前端实现
```javascript
async handleProcessData({ data_type, data, merge }) {
  switch (data_type) {
    case 'user':
      if (merge) {
        this.store.updateUser(data)  // 合并更新
      } else {
        this.store.setUser(data)     // 完全替换
      }
      break
      
    case 'userList':
      this.store.setUserList(data)
      break
      
    default:
      console.warn('Unknown data type:', data_type)
  }
}
```

### 4. Sequence - 序列指令

用于按顺序执行多个路由指令。

#### 数据结构
```typescript
interface SequencePayload {
  commands: RouteCommand[]
}
```

#### 示例

**登录成功流程**：
```json
{
  "type": "Sequence",
  "payload": {
    "commands": [
      {
        "type": "ProcessData",
        "payload": {
          "data_type": "user",
          "data": { "id": 123, "username": "admin" }
        }
      },
      {
        "type": "ShowDialog",
        "payload": {
          "dialog_type": "Toast",
          "title": "",
          "content": "登录成功"
        }
      },
      {
        "type": "NavigateTo",
        "payload": {
          "path": "/home",
          "replace": true
        }
      }
    ]
  }
}
```

#### 前端实现
```javascript
async handleSequence({ commands }) {
  for (const command of commands) {
    await this.execute(command)
    // 可以在这里添加延迟或其他逻辑
  }
}
```

### 5. RequestPayment - 请求支付

用于触发前端支付流程。

#### 数据结构
```typescript
interface RequestPaymentPayload {
  payment_info: PaymentInfo
  callback_url: string
}

interface PaymentInfo {
  order_id: string
  amount: number
  currency: string
  description: string
  payment_method: 'wechat' | 'alipay' | 'card'
}
```

#### 示例

**微信支付**：
```json
{
  "type": "RequestPayment",
  "payload": {
    "payment_info": {
      "order_id": "ORDER_123456",
      "amount": 9900,
      "currency": "CNY",
      "description": "商品购买",
      "payment_method": "wechat"
    },
    "callback_url": "/api/payment/callback"
  }
}
```

#### 前端实现
```javascript
async handleRequestPayment({ payment_info, callback_url }) {
  switch (payment_info.payment_method) {
    case 'wechat':
      await this.handleWechatPay(payment_info, callback_url)
      break
    case 'alipay':
      await this.handleAlipay(payment_info, callback_url)
      break
    default:
      console.error('Unsupported payment method:', payment_info.payment_method)
  }
}
```

### 6. Conditional - 条件指令

根据前端状态条件执行不同的指令。

#### 数据结构
```typescript
interface ConditionalPayload {
  condition: string                  // 条件表达式
  if_true: RouteCommand             // 条件为真时执行的指令
  if_false?: RouteCommand           // 条件为假时执行的指令（可选）
}
```

#### 示例

**根据用户类型跳转**：
```json
{
  "type": "Conditional",
  "payload": {
    "condition": "user.is_admin",
    "if_true": {
      "type": "NavigateTo",
      "payload": { "path": "/admin-dashboard" }
    },
    "if_false": {
      "type": "NavigateTo",
      "payload": { "path": "/user-dashboard" }
    }
  }
}
```

#### 前端实现
```javascript
async handleConditional({ condition, if_true, if_false }) {
  const conditionResult = this.evaluateCondition(condition)
  
  if (conditionResult && if_true) {
    await this.execute(if_true)
  } else if (!conditionResult && if_false) {
    await this.execute(if_false)
  }
}

evaluateCondition(condition) {
  // 简单的条件评估实现
  // 在生产环境中，应该使用更安全的表达式解析器
  try {
    return new Function('user', 'store', `return ${condition}`)(
      this.store.user,
      this.store
    )
  } catch (error) {
    console.error('Condition evaluation failed:', error)
    return false
  }
}
```

## 错误处理

### 错误响应格式

当API调用失败时，仍然可以返回路由指令来处理错误：

```json
{
  "code": 400,
  "message": "Invalid request",
  "data": null,
  "route_command": {
    "type": "ShowDialog",
    "payload": {
      "dialog_type": "Alert",
      "title": "请求失败",
      "content": "请检查输入信息后重试"
    }
  }
}
```

### 错误指令类型

#### 通用错误处理
```json
{
  "type": "Sequence",
  "payload": {
    "commands": [
      {
        "type": "ShowDialog",
        "payload": {
          "dialog_type": "Alert",
          "title": "操作失败",
          "content": "系统错误，请稍后重试"
        }
      },
      {
        "type": "NavigateTo",
        "payload": {
          "path": "/error",
          "params": { "error_code": "500" }
        }
      }
    ]
  }
}
```

#### 认证失败处理
```json
{
  "type": "Sequence",
  "payload": {
    "commands": [
      {
        "type": "ProcessData",
        "payload": {
          "data_type": "user",
          "data": null
        }
      },
      {
        "type": "ShowDialog",
        "payload": {
          "dialog_type": "Toast",
          "title": "",
          "content": "登录已过期，请重新登录"
        }
      },
      {
        "type": "NavigateTo",
        "payload": {
          "path": "/login",
          "replace": true
        }
      }
    ]
  }
}
```

## 后端实现示例

### Rust实现

```rust
// 路由指令枚举定义
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    NavigateTo {
        path: String,
        params: Option<serde_json::Value>,
        replace: Option<bool>,
    },
    ShowDialog {
        dialog_type: DialogType,
        title: String,
        content: String,
        actions: Vec<DialogAction>,
    },
    ProcessData {
        data_type: String,
        data: serde_json::Value,
        merge: Option<bool>,
    },
    Sequence {
        commands: Vec<RouteCommand>,
    },
    RequestPayment {
        payment_info: PaymentInfo,
        callback_url: String,
    },
    Conditional {
        condition: String,
        if_true: Box<RouteCommand>,
        if_false: Option<Box<RouteCommand>>,
    },
}

// 响应构建器
impl<T> ApiResponse<T> {
    pub fn with_navigation(data: T, path: &str) -> Self {
        Self::success_with_command(
            data,
            RouteCommand::NavigateTo {
                path: path.to_string(),
                params: None,
                replace: None,
            }
        )
    }
    
    pub fn with_toast(data: T, message: &str) -> Self {
        Self::success_with_command(
            data,
            RouteCommand::ShowDialog {
                dialog_type: DialogType::Toast,
                title: "".to_string(),
                content: message.to_string(),
                actions: vec![],
            }
        )
    }
}

// 使用示例
#[post("/api/users", data = "<user_data>")]
pub async fn create_user(user_data: Json<CreateUserRequest>) -> Json<ApiResponse<User>> {
    match user_service.create_user(user_data.into_inner()).await {
        Ok(user) => {
            Json(ApiResponse::with_navigation(user, "/users"))
        }
        Err(e) => {
            Json(ApiResponse::command_only(RouteCommand::ShowDialog {
                dialog_type: DialogType::Alert,
                title: "创建失败".to_string(),
                content: e.to_string(),
                actions: vec![],
            }))
        }
    }
}
```

## 最佳实践

### 1. 指令命名规范

- 使用PascalCase命名指令类型：`NavigateTo`, `ShowDialog`
- 使用snake_case命名字段：`data_type`, `dialog_type`
- 保持指令名称简洁明了

### 2. 数据类型管理

建议为常用的`data_type`建立枚举：

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum DataType {
    #[serde(rename = "user")]
    User,
    #[serde(rename = "userList")]
    UserList,
    #[serde(rename = "settings")]
    Settings,
}
```

### 3. 指令组合策略

- 优先使用单一指令
- 必要时使用`Sequence`组合多个指令
- 避免过深的嵌套结构

### 4. 错误处理一致性

- 统一错误指令格式
- 提供用户友好的错误信息
- 包含必要的错误恢复指令

### 5. 版本兼容性

- 为新指令类型提供默认处理
- 保持向后兼容性
- 逐步废弃旧指令类型

## 扩展指令

### 自定义指令示例

如果需要添加新的指令类型，可以扩展`RouteCommand`枚举：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    // ... 现有指令
    
    // 新增：刷新页面
    RefreshPage {
        preserve_scroll: Option<bool>,
    },
    
    // 新增：调用JS函数
    CallFunction {
        function_name: String,
        parameters: Option<serde_json::Value>,
    },
    
    // 新增：设置主题
    SetTheme {
        theme: String,
    },
}
```

对应的前端处理：

```javascript
async execute(routeCommand) {
  switch (routeCommand.type) {
    // ... 现有处理
    
    case 'RefreshPage':
      return this.handleRefreshPage(routeCommand.payload)
    
    case 'CallFunction':
      return this.handleCallFunction(routeCommand.payload)
    
    case 'SetTheme':
      return this.handleSetTheme(routeCommand.payload)
    
    default:
      console.warn('Unknown route command type:', routeCommand.type)
  }
}
```

这种扩展机制确保了系统的可扩展性和灵活性，允许根据业务需求添加新的指令类型。