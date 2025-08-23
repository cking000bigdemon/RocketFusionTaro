# 后端驱动路由系统开发指南

## 目录

- [快速开始](#快速开始)
- [后端开发](#后端开发)
- [前端开发](#前端开发)
- [完整示例](#完整示例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 快速开始

本指南将帮助您在现有的Rocket + Taro项目中实现后端驱动路由系统。我们将从一个简单的用户登录功能开始，逐步展示如何使用这套架构。

### 前置条件

- Rust 1.70+ 和 Rocket 框架
- Node.js 16+ 和 Taro 3.6+
- 对异步编程和REST API有基本了解

### 项目结构概览

```
project/
├── rocket-taro-server/           # 后端Rust项目
│   ├── src/
│   │   ├── models/
│   │   │   └── route_command.rs  # 路由指令定义
│   │   ├── use_cases/            # 业务用例层
│   │   │   └── auth_use_case.rs
│   │   └── routes/
│   │       └── auth.rs           # 路由处理器
├── frontend/                     # 前端Taro项目
│   ├── src/
│   │   ├── utils/
│   │   │   └── routerHandler.js  # 路由处理器
│   │   ├── stores/
│   │   │   └── app.js           # 状态管理
│   │   └── pages/
│   │       └── login/           # 登录页面
└── docs/                        # 文档
```

## 后端开发

### 步骤1：定义路由指令模型

首先创建路由指令的数据模型，这是前后端通信的核心协议。

```rust
// src/models/route_command.rs
use serde::{Deserialize, Serialize};

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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DialogType {
    Alert,
    Confirm,
    Toast,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogAction {
    pub text: String,
    pub action: Option<RouteCommand>,
}
```

### 步骤2：更新API响应模型

修改现有的API响应模型以支持路由指令：

```rust
// src/models/response.rs
use serde::{Deserialize, Serialize};
use super::route_command::RouteCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
    pub route_command: Option<RouteCommand>,  // 新增：路由指令
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

    pub fn success_with_command(data: T, command: RouteCommand) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: Some(data),
            route_command: Some(command),
        }
    }

    pub fn command_only(command: RouteCommand) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: None,
            route_command: Some(command),
        }
    }
}
```

### 步骤3：创建用例层

用例层负责业务逻辑处理和路由决策：

```rust
// src/use_cases/auth_use_case.rs
use std::sync::Arc;
use serde_json::json;
use crate::database::DbPool;
use crate::models::{
    auth::{LoginRequest, User},
    route_command::RouteCommand,
};

pub struct AuthUseCase {
    db_pool: Arc<DbPool>,
}

impl AuthUseCase {
    pub fn new(db_pool: Arc<DbPool>) -> Self {
        Self { db_pool }
    }

    pub async fn handle_login(&self, request: LoginRequest) -> Result<RouteCommand, Box<dyn std::error::Error>> {
        // 1. 验证用户凭据
        let user = self.authenticate_user(&request).await?;
        
        // 2. 创建会话
        let session = self.create_session(&user).await?;
        
        // 3. 根据用户状态决定下一步操作
        let route_command = self.determine_post_login_action(&user).await?;
        
        Ok(route_command)
    }

    async fn authenticate_user(&self, request: &LoginRequest) -> Result<User, Box<dyn std::error::Error>> {
        // 这里调用现有的认证逻辑
        crate::database::auth::authenticate_user(&self.db_pool, request).await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?
            .ok_or_else(|| "Invalid credentials".into())
    }

    async fn create_session(&self, user: &User) -> Result<String, Box<dyn std::error::Error>> {
        // 这里调用现有的会话创建逻辑
        let session = crate::database::auth::create_user_session(
            &self.db_pool, 
            user.id, 
            None, 
            None
        ).await?;
        Ok(session.session_token)
    }

    async fn determine_post_login_action(&self, user: &User) -> Result<RouteCommand, Box<dyn std::error::Error>> {
        // 根据业务逻辑决定登录后的操作
        if user.is_first_login {
            // 首次登录，引导到欢迎页面
            Ok(RouteCommand::NavigateTo {
                path: "/welcome".to_string(),
                params: Some(json!({"user_id": user.id})),
                replace: Some(true),
            })
        } else if self.has_pending_tasks(user).await? {
            // 有待处理任务，显示提醒对话框
            Ok(RouteCommand::ShowDialog {
                dialog_type: crate::models::route_command::DialogType::Confirm,
                title: "待处理任务".to_string(),
                content: "您有未完成的任务，是否立即处理？".to_string(),
                actions: vec![
                    crate::models::route_command::DialogAction {
                        text: "稍后处理".to_string(),
                        action: Some(RouteCommand::NavigateTo {
                            path: "/home".to_string(),
                            params: None,
                            replace: Some(true),
                        }),
                    },
                    crate::models::route_command::DialogAction {
                        text: "立即处理".to_string(),
                        action: Some(RouteCommand::NavigateTo {
                            path: "/tasks".to_string(),
                            params: None,
                            replace: Some(true),
                        }),
                    },
                ],
            })
        } else {
            // 正常登录，组合更新用户状态和跳转首页
            Ok(RouteCommand::Sequence {
                commands: vec![
                    RouteCommand::ProcessData {
                        data_type: "user".to_string(),
                        data: serde_json::to_value(user)?,
                        merge: Some(false),
                    },
                    RouteCommand::NavigateTo {
                        path: "/home".to_string(),
                        params: None,
                        replace: Some(true),
                    },
                ],
            })
        }
    }

    async fn has_pending_tasks(&self, user: &User) -> Result<bool, Box<dyn std::error::Error>> {
        // 检查用户是否有待处理任务的逻辑
        // 这里是示例实现
        Ok(false)
    }
}
```

### 步骤4：更新路由处理器

修改现有的路由处理器以使用用例层：

```rust
// src/routes/auth.rs
use rocket::{State, serde::json::Json, post};
use crate::{
    models::{
        auth::LoginRequest,
        response::ApiResponse,
        route_command::RouteCommand,
    },
    use_cases::auth_use_case::AuthUseCase,
    database::DbPool,
};

#[post("/api/auth/login", data = "<login_req>")]
pub async fn login(
    pool: &State<DbPool>,
    login_req: Json<LoginRequest>,
) -> Json<ApiResponse<()>> {
    let use_case = AuthUseCase::new(pool.inner().clone());
    
    match use_case.handle_login(login_req.into_inner()).await {
        Ok(route_command) => {
            Json(ApiResponse::command_only(route_command))
        }
        Err(e) => {
            eprintln!("Login failed: {}", e);
            Json(ApiResponse::command_only(RouteCommand::ShowDialog {
                dialog_type: crate::models::route_command::DialogType::Alert,
                title: "登录失败".to_string(),
                content: "用户名或密码错误".to_string(),
                actions: vec![],
            }))
        }
    }
}
```

### 步骤5：更新模块声明

在相应的模块文件中添加新的模块声明：

```rust
// src/models/mod.rs
pub mod auth;
pub mod response;
pub mod route_command;  // 新增
pub mod user_data;

// src/use_cases/mod.rs
pub mod auth_use_case;  // 新增

// src/main.rs 或 lib.rs
mod use_cases;  // 新增
```

## 前端开发

### 步骤1：创建路由处理器

路由处理器是前端的核心组件，负责解析和执行后端发送的路由指令：

```javascript
// src/utils/routerHandler.js
import Taro from '@tarojs/taro'

class RouterHandler {
    constructor(store) {
        this.store = store
    }

    async execute(routeCommand) {
        if (!routeCommand) {
            console.warn('No route command to execute')
            return
        }

        console.log('Executing route command:', routeCommand)

        switch (routeCommand.type) {
            case 'NavigateTo':
                return this.handleNavigateTo(routeCommand.payload)
            
            case 'ShowDialog':
                return this.handleShowDialog(routeCommand.payload)
            
            case 'ProcessData':
                return this.handleProcessData(routeCommand.payload)
            
            case 'Sequence':
                return this.handleSequence(routeCommand.payload)
            
            default:
                console.warn('Unknown route command type:', routeCommand.type)
        }
    }

    async handleNavigateTo({ path, params, replace }) {
        try {
            let url = path
            
            // 添加查询参数
            if (params) {
                const searchParams = new URLSearchParams()
                Object.entries(params).forEach(([key, value]) => {
                    searchParams.append(key, String(value))
                })
                url += `?${searchParams.toString()}`
            }

            console.log(`Navigating to: ${url} (replace: ${replace})`)

            if (replace) {
                await Taro.redirectTo({ url })
            } else {
                await Taro.navigateTo({ url })
            }
        } catch (error) {
            console.error('Navigation failed:', error)
            Taro.showToast({
                title: '页面跳转失败',
                icon: 'error'
            })
        }
    }

    async handleShowDialog({ dialog_type, title, content, actions }) {
        switch (dialog_type) {
            case 'Alert':
                await Taro.showModal({
                    title,
                    content,
                    showCancel: false,
                    confirmText: '确定'
                })
                break

            case 'Confirm':
                if (actions && actions.length > 0) {
                    const result = await Taro.showModal({
                        title,
                        content,
                        cancelText: actions[0]?.text || '取消',
                        confirmText: actions[1]?.text || '确定'
                    })

                    if (result.confirm && actions[1]?.action) {
                        await this.execute(actions[1].action)
                    } else if (result.cancel && actions[0]?.action) {
                        await this.execute(actions[0].action)
                    }
                } else {
                    await Taro.showModal({
                        title,
                        content,
                        showCancel: false
                    })
                }
                break

            case 'Toast':
                Taro.showToast({
                    title: content,
                    icon: 'none',
                    duration: 2000
                })
                break

            default:
                console.warn('Unknown dialog type:', dialog_type)
        }
    }

    async handleProcessData({ data_type, data, merge }) {
        console.log(`Processing data: ${data_type}`, data)

        switch (data_type) {
            case 'user':
                if (merge) {
                    this.store.updateUser(data)
                } else {
                    this.store.setUser(data)
                }
                break

            case 'userList':
                this.store.setUserList(data)
                break

            default:
                console.warn('Unknown data type:', data_type)
        }
    }

    async handleSequence({ commands }) {
        console.log('Executing command sequence:', commands)
        
        for (const command of commands) {
            await this.execute(command)
        }
    }
}

export default RouterHandler
```

### 步骤2：更新API服务层

修改现有的状态管理文件，集成路由处理器：

```javascript
// src/stores/app.js (部分修改)
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import RouterHandler from '../utils/routerHandler'

export const useStore = create((set, get) => {
    // 创建路由处理器实例
    const routerHandler = new RouterHandler({
        setUser: (user) => set({ user }),
        updateUser: (userData) => set(state => ({ user: { ...state.user, ...userData } })),
        setUserList: (userList) => set({ userList }),
    })

    return {
        user: null,
        loading: false,
        userList: [],
        
        // 登录方法的新实现
        login: async (credentials) => {
            console.log('🔐 开始登录流程:', credentials.username)
            set({ loading: true })
            
            try {
                const data = await request('/api/auth/login', {
                    method: 'POST',
                    data: credentials
                })
                
                console.log('🔐 登录响应数据:', data)
                
                if (data && data.code === 200) {
                    // 执行路由指令
                    if (data.route_command) {
                        await routerHandler.execute(data.route_command)
                    }
                    
                    set({ loading: false })
                    console.log('✅ 登录成功')
                    return data
                } else {
                    const errorMsg = (data && data.message) || '登录失败：服务器返回异常数据'
                    throw new Error(errorMsg)
                }
            } catch (error) {
                console.error('❌ 登录流程失败:', error)
                set({ loading: false })
                
                Taro.showToast({
                    title: error.message || '登录失败',
                    icon: 'error',
                    duration: 3000
                })
                throw error
            }
        },

        // 其他方法保持不变...
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
        setUserList: (userList) => set({ userList }),
    }
})

// 其余的request函数和其他方法保持不变
```

### 步骤3：创建登录页面

创建新的登录页面组件：

```javascript
// src/pages/login/index.jsx
import { View, Text, Input, Button, Form } from '@tarojs/components'
import { useState } from 'react'
import { useStore } from '../../stores/app'
import './index.css'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  const { login, loading } = useStore()

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.username || !formData.password) {
      Taro.showToast({
        title: '请填写完整信息',
        icon: 'error'
      })
      return
    }

    try {
      await login(formData)
      // 登录成功后的跳转由路由指令处理，这里不需要手动跳转
    } catch (error) {
      // 错误处理已在store中完成
    }
  }

  return (
    <View className='login-container'>
      <View className='login-header'>
        <Text className='login-title'>用户登录</Text>
        <Text className='login-subtitle'>欢迎回来</Text>
      </View>

      <View className='login-form'>
        <View className='form-item'>
          <Text className='form-label'>用户名</Text>
          <Input
            className='form-input'
            placeholder='请输入用户名'
            value={formData.username}
            onInput={(e) => handleInputChange('username', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>密码</Text>
          <Input
            className='form-input'
            type='password'
            placeholder='请输入密码'
            value={formData.password}
            onInput={(e) => handleInputChange('password', e.detail.value)}
          />
        </View>

        <Button 
          className='login-button'
          onClick={handleSubmit}
          loading={loading}
        >
          登录
        </Button>
      </View>

      <View className='login-footer'>
        <Text className='footer-text'>测试账号: admin / password</Text>
      </View>
    </View>
  )
}
```

```css
/* src/pages/login/index.css */
.login-container {
  min-height: 100vh;
  padding: 40px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 60px;
}

.login-title {
  font-size: 32px;
  font-weight: bold;
  color: white;
  display: block;
  margin-bottom: 10px;
}

.login-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.login-form {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  height: 44px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 16px;
  background: #fafafa;
}

.login-button {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 10px;
}

.login-footer {
  text-align: center;
  margin-top: 30px;
}

.footer-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
```

### 步骤4：更新应用配置

在Taro应用配置中添加登录页面：

```javascript
// src/app.config.js
export default defineAppConfig({
  pages: [
    'pages/login/index',      // 新增登录页面
    'pages/index/index',
    'pages/about/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  }
})
```

## 完整示例

### 用户登录流程示例

这是一个完整的用户登录流程，展示了后端驱动路由系统的工作原理：

1. **用户操作**：用户在登录页面输入用户名和密码，点击登录
2. **前端请求**：调用 `/api/auth/login` API
3. **后端处理**：
   - 验证用户凭据
   - 创建用户会话
   - 根据用户状态生成路由指令
4. **前端响应**：执行路由指令，完成页面跳转或状态更新

### 扩展示例：支付流程

```rust
// 后端：支付用例
pub async fn handle_payment(&self, request: PaymentRequest) -> Result<RouteCommand, Error> {
    let user = self.get_user(request.user_id).await?;
    
    if user.balance >= request.amount {
        // 余额充足，直接支付
        self.process_payment(&request).await?;
        Ok(RouteCommand::Sequence {
            commands: vec![
                RouteCommand::ShowDialog {
                    dialog_type: DialogType::Toast,
                    title: "".to_string(),
                    content: "支付成功".to_string(),
                    actions: vec![],
                },
                RouteCommand::NavigateTo {
                    path: "/order-success".to_string(),
                    params: Some(json!({"order_id": request.order_id})),
                    replace: Some(true),
                },
            ],
        })
    } else {
        // 余额不足，引导充值
        Ok(RouteCommand::ShowDialog {
            dialog_type: DialogType::Confirm,
            title: "余额不足".to_string(),
            content: "当前余额不足，是否前往充值？".to_string(),
            actions: vec![
                DialogAction {
                    text: "取消".to_string(),
                    action: None,
                },
                DialogAction {
                    text: "去充值".to_string(),
                    action: Some(RouteCommand::NavigateTo {
                        path: "/recharge".to_string(),
                        params: Some(json!({"amount": request.amount - user.balance})),
                        replace: Some(false),
                    }),
                },
            ],
        })
    }
}
```

## 最佳实践

### 1. 路由指令设计原则

- **单一职责**：每个路由指令应该有明确的单一职责
- **可组合性**：使用 `Sequence` 指令组合多个简单指令
- **幂等性**：相同的指令多次执行应该产生相同的结果
- **可测试性**：路由指令应该易于单元测试

### 2. 错误处理策略

```rust
// 后端错误处理
impl From<DatabaseError> for RouteCommand {
    fn from(error: DatabaseError) -> Self {
        RouteCommand::ShowDialog {
            dialog_type: DialogType::Alert,
            title: "系统错误".to_string(),
            content: "服务暂时不可用，请稍后重试".to_string(),
            actions: vec![],
        }
    }
}

// 前端错误处理
async execute(routeCommand) {
    try {
        await this.executeInternal(routeCommand)
    } catch (error) {
        console.error('Route command execution failed:', error)
        Taro.showToast({
            title: '操作失败，请重试',
            icon: 'error'
        })
    }
}
```

### 3. 性能优化

- **避免深层嵌套**：限制 `Sequence` 指令的嵌套深度
- **合理使用缓存**：对频繁使用的路由指令进行缓存
- **异步执行**：前端路由处理器使用异步方式执行指令

### 4. 调试和监控

```javascript
// 开发环境启用详细日志
const DEBUG = process.env.NODE_ENV === 'development'

class RouterHandler {
    async execute(routeCommand) {
        if (DEBUG) {
            console.group('🚀 Route Command Execution')
            console.log('Command:', routeCommand)
            console.time('Execution Time')
        }

        try {
            await this.executeInternal(routeCommand)
        } finally {
            if (DEBUG) {
                console.timeEnd('Execution Time')
                console.groupEnd()
            }
        }
    }
}
```

## 故障排除

### 常见问题及解决方案

#### 1. 路由指令未执行

**问题**：前端收到响应但路由指令没有执行

**解决方案**：
- 检查API响应格式是否正确
- 确认路由处理器是否正确注册
- 查看浏览器控制台错误信息

```javascript
// 调试代码
const response = await api.login(credentials)
console.log('API Response:', response)
console.log('Route Command:', response.route_command)
```

#### 2. 页面跳转失败

**问题**：`NavigateTo` 指令执行但页面没有跳转

**解决方案**：
- 确认页面路径是否正确配置
- 检查Taro页面配置文件
- 验证页面是否存在

#### 3. 状态更新不生效

**问题**：`ProcessData` 指令执行但状态没有更新

**解决方案**：
- 检查Store的setter方法是否正确
- 确认数据格式是否匹配
- 验证组件是否正确订阅Store变化

### 调试工具

#### 后端调试

```rust
// 启用详细日志
#[post("/api/auth/login")]
pub async fn login(login_req: Json<LoginRequest>) -> Json<ApiResponse<()>> {
    tracing::info!("Login request: {:?}", login_req);
    
    let result = use_case.handle_login(login_req.into_inner()).await;
    
    match &result {
        Ok(command) => tracing::info!("Generated route command: {:?}", command),
        Err(e) => tracing::error!("Login failed: {}", e),
    }
    
    // ... 处理结果
}
```

#### 前端调试

```javascript
// 路由指令执行跟踪
class RouterHandler {
    async execute(routeCommand) {
        const executionId = Math.random().toString(36).substr(2, 9)
        console.log(`[${executionId}] Executing:`, routeCommand)
        
        try {
            await this.executeInternal(routeCommand)
            console.log(`[${executionId}] Success`)
        } catch (error) {
            console.error(`[${executionId}] Failed:`, error)
            throw error
        }
    }
}
```

通过这个开发指南，您应该能够成功实现后端驱动路由系统。记住要循序渐进地实施，先从简单的功能开始，逐步扩展到更复杂的业务场景。