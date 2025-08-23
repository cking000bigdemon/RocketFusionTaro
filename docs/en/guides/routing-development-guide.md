# Backend-Driven Routing System Development Guide

## Table of Contents

- [Quick Start](#quick-start)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

This guide will help you implement the backend-driven routing system in your existing Rocket + Taro project. We'll start with a simple user login functionality and gradually demonstrate how to use this architecture.

### Prerequisites

- Rust 1.70+ and Rocket framework
- Node.js 16+ and Taro 3.6+
- Basic understanding of asynchronous programming and REST APIs

### Project Structure Overview

```
project/
├── rocket-taro-server/           # Backend Rust project
│   ├── src/
│   │   ├── models/
│   │   │   └── route_command.rs  # Route command definitions
│   │   ├── use_cases/            # Business use case layer
│   │   │   └── auth_use_case.rs
│   │   └── routes/
│   │       └── auth.rs           # Route handlers
├── frontend/                     # Frontend Taro project
│   ├── src/
│   │   ├── utils/
│   │   │   └── routerHandler.js  # Route handler
│   │   ├── stores/
│   │   │   └── app.js           # State management
│   │   └── pages/
│   │       └── login/           # Login page
└── docs/                        # Documentation
```

## Backend Development

### Step 1: Define Route Command Models

First create the route command data models, which are the core protocol for frontend-backend communication.

```rust
// src/models/route_command.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    /// Page navigation
    NavigateTo {
        path: String,
        params: Option<serde_json::Value>,
        replace: Option<bool>,
    },
    
    /// Show dialog
    ShowDialog {
        dialog_type: DialogType,
        title: String,
        content: String,
        actions: Vec<DialogAction>,
    },
    
    /// Process data (update frontend state)
    ProcessData {
        data_type: String,
        data: serde_json::Value,
        merge: Option<bool>,
    },
    
    /// Composite command (execute in sequence)
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

### Step 2: Update API Response Model

Modify the existing API response model to support route commands:

```rust
// src/models/response.rs
use serde::{Deserialize, Serialize};
use super::route_command::RouteCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
    pub route_command: Option<RouteCommand>,  // New: route command
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

### Step 3: Create Use Case Layer

The use case layer is responsible for business logic processing and routing decisions:

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
        // 1. Validate user credentials
        let user = self.authenticate_user(&request).await?;
        
        // 2. Create session
        let session = self.create_session(&user).await?;
        
        // 3. Determine next action based on user state
        let route_command = self.determine_post_login_action(&user).await?;
        
        Ok(route_command)
    }

    async fn authenticate_user(&self, request: &LoginRequest) -> Result<User, Box<dyn std::error::Error>> {
        // Call existing authentication logic here
        crate::database::auth::authenticate_user(&self.db_pool, request).await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?
            .ok_or_else(|| "Invalid credentials".into())
    }

    async fn create_session(&self, user: &User) -> Result<String, Box<dyn std::error::Error>> {
        // Call existing session creation logic here
        let session = crate::database::auth::create_user_session(
            &self.db_pool, 
            user.id, 
            None, 
            None
        ).await?;
        Ok(session.session_token)
    }

    async fn determine_post_login_action(&self, user: &User) -> Result<RouteCommand, Box<dyn std::error::Error>> {
        // Determine post-login action based on business logic
        if user.is_first_login {
            // First login, guide to welcome page
            Ok(RouteCommand::NavigateTo {
                path: "/welcome".to_string(),
                params: Some(json!({"user_id": user.id})),
                replace: Some(true),
            })
        } else if self.has_pending_tasks(user).await? {
            // Has pending tasks, show reminder dialog
            Ok(RouteCommand::ShowDialog {
                dialog_type: crate::models::route_command::DialogType::Confirm,
                title: "Pending Tasks".to_string(),
                content: "You have unfinished tasks. Would you like to handle them now?".to_string(),
                actions: vec![
                    crate::models::route_command::DialogAction {
                        text: "Later".to_string(),
                        action: Some(RouteCommand::NavigateTo {
                            path: "/home".to_string(),
                            params: None,
                            replace: Some(true),
                        }),
                    },
                    crate::models::route_command::DialogAction {
                        text: "Handle Now".to_string(),
                        action: Some(RouteCommand::NavigateTo {
                            path: "/tasks".to_string(),
                            params: None,
                            replace: Some(true),
                        }),
                    },
                ],
            })
        } else {
            // Normal login, combine user state update and home page navigation
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
        // Logic to check if user has pending tasks
        // This is an example implementation
        Ok(false)
    }
}
```

### Step 4: Update Route Handlers

Modify existing route handlers to use the use case layer:

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
                title: "Login Failed".to_string(),
                content: "Invalid username or password".to_string(),
                actions: vec![],
            }))
        }
    }
}
```

### Step 5: Update Module Declarations

Add new module declarations in the respective module files:

```rust
// src/models/mod.rs
pub mod auth;
pub mod response;
pub mod route_command;  // New
pub mod user_data;

// src/use_cases/mod.rs
pub mod auth_use_case;  // New

// src/main.rs or lib.rs
mod use_cases;  // New
```

## Frontend Development

### Step 1: Create Router Handler

The router handler is the core frontend component responsible for parsing and executing route commands sent by the backend:

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
            
            // Add query parameters
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
                title: 'Navigation failed',
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
                    confirmText: 'OK'
                })
                break

            case 'Confirm':
                if (actions && actions.length > 0) {
                    const result = await Taro.showModal({
                        title,
                        content,
                        cancelText: actions[0]?.text || 'Cancel',
                        confirmText: actions[1]?.text || 'Confirm'
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

### Step 2: Update API Service Layer

Modify the existing state management file to integrate the router handler:

```javascript
// src/stores/app.js (partial modification)
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import RouterHandler from '../utils/routerHandler'

export const useStore = create((set, get) => {
    // Create router handler instance
    const routerHandler = new RouterHandler({
        setUser: (user) => set({ user }),
        updateUser: (userData) => set(state => ({ user: { ...state.user, ...userData } })),
        setUserList: (userList) => set({ userList }),
    })

    return {
        user: null,
        loading: false,
        userList: [],
        
        // New implementation of login method
        login: async (credentials) => {
            console.log('🔐 Starting login process:', credentials.username)
            set({ loading: true })
            
            try {
                const data = await request('/api/auth/login', {
                    method: 'POST',
                    data: credentials
                })
                
                console.log('🔐 Login response data:', data)
                
                if (data && data.code === 200) {
                    // Execute route command
                    if (data.route_command) {
                        await routerHandler.execute(data.route_command)
                    }
                    
                    set({ loading: false })
                    console.log('✅ Login successful')
                    return data
                } else {
                    const errorMsg = (data && data.message) || 'Login failed: Server returned unexpected data'
                    throw new Error(errorMsg)
                }
            } catch (error) {
                console.error('❌ Login process failed:', error)
                set({ loading: false })
                
                Taro.showToast({
                    title: error.message || 'Login failed',
                    icon: 'error',
                    duration: 3000
                })
                throw error
            }
        },

        // Other methods remain unchanged...
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
        setUserList: (userList) => set({ userList }),
    }
})

// The rest of the request function and other methods remain unchanged
```

### Step 3: Create Login Page

Create a new login page component:

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
        title: 'Please fill in all fields',
        icon: 'error'
      })
      return
    }

    try {
      await login(formData)
      // Post-login navigation is handled by route commands, no manual navigation needed here
    } catch (error) {
      // Error handling is already completed in the store
    }
  }

  return (
    <View className='login-container'>
      <View className='login-header'>
        <Text className='login-title'>User Login</Text>
        <Text className='login-subtitle'>Welcome Back</Text>
      </View>

      <View className='login-form'>
        <View className='form-item'>
          <Text className='form-label'>Username</Text>
          <Input
            className='form-input'
            placeholder='Enter username'
            value={formData.username}
            onInput={(e) => handleInputChange('username', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>Password</Text>
          <Input
            className='form-input'
            type='password'
            placeholder='Enter password'
            value={formData.password}
            onInput={(e) => handleInputChange('password', e.detail.value)}
          />
        </View>

        <Button 
          className='login-button'
          onClick={handleSubmit}
          loading={loading}
        >
          Login
        </Button>
      </View>

      <View className='login-footer'>
        <Text className='footer-text'>Test Account: admin / password</Text>
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

### Step 4: Update App Configuration

Add the login page to the Taro app configuration:

```javascript
// src/app.config.js
export default defineAppConfig({
  pages: [
    'pages/login/index',      // New login page
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

## Complete Examples

### User Login Flow Example

This is a complete user login flow demonstrating how the backend-driven routing system works:

1. **User Action**: User enters username and password on the login page and clicks login
2. **Frontend Request**: Calls `/api/auth/login` API
3. **Backend Processing**:
   - Validates user credentials
   - Creates user session
   - Generates route command based on user state
4. **Frontend Response**: Executes route command, completes page navigation or state update

### Extended Example: Payment Flow

```rust
// Backend: Payment use case
pub async fn handle_payment(&self, request: PaymentRequest) -> Result<RouteCommand, Error> {
    let user = self.get_user(request.user_id).await?;
    
    if user.balance >= request.amount {
        // Sufficient balance, process payment directly
        self.process_payment(&request).await?;
        Ok(RouteCommand::Sequence {
            commands: vec![
                RouteCommand::ShowDialog {
                    dialog_type: DialogType::Toast,
                    title: "".to_string(),
                    content: "Payment successful".to_string(),
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
        // Insufficient balance, guide to recharge
        Ok(RouteCommand::ShowDialog {
            dialog_type: DialogType::Confirm,
            title: "Insufficient Balance".to_string(),
            content: "Your current balance is insufficient. Would you like to recharge?".to_string(),
            actions: vec![
                DialogAction {
                    text: "Cancel".to_string(),
                    action: None,
                },
                DialogAction {
                    text: "Recharge".to_string(),
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

## Best Practices

### 1. Route Command Design Principles

- **Single Responsibility**: Each route command should have a clear single responsibility
- **Composability**: Use `Sequence` commands to compose multiple simple commands
- **Idempotency**: The same command should produce the same result when executed multiple times
- **Testability**: Route commands should be easy to unit test

### 2. Error Handling Strategy

```rust
// Backend error handling
impl From<DatabaseError> for RouteCommand {
    fn from(error: DatabaseError) -> Self {
        RouteCommand::ShowDialog {
            dialog_type: DialogType::Alert,
            title: "System Error".to_string(),
            content: "Service temporarily unavailable, please try again later".to_string(),
            actions: vec![],
        }
    }
}

// Frontend error handling
async execute(routeCommand) {
    try {
        await this.executeInternal(routeCommand)
    } catch (error) {
        console.error('Route command execution failed:', error)
        Taro.showToast({
            title: 'Operation failed, please retry',
            icon: 'error'
        })
    }
}
```

### 3. Performance Optimization

- **Avoid Deep Nesting**: Limit the nesting depth of `Sequence` commands
- **Use Caching Appropriately**: Cache frequently used route commands
- **Asynchronous Execution**: Frontend router handler uses asynchronous execution

### 4. Debugging and Monitoring

```javascript
// Enable detailed logging in development environment
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

## Troubleshooting

### Common Issues and Solutions

#### 1. Route Commands Not Executing

**Problem**: Frontend receives response but route commands don't execute

**Solution**:
- Check if API response format is correct
- Confirm router handler is properly registered
- Check browser console for error messages

```javascript
// Debug code
const response = await api.login(credentials)
console.log('API Response:', response)
console.log('Route Command:', response.route_command)
```

#### 2. Page Navigation Fails

**Problem**: `NavigateTo` command executes but page doesn't navigate

**Solution**:
- Confirm page path is correctly configured
- Check Taro page configuration file
- Verify page exists

#### 3. State Updates Don't Take Effect

**Problem**: `ProcessData` command executes but state doesn't update

**Solution**:
- Check if Store setter methods are correct
- Confirm data format matches
- Verify components properly subscribe to Store changes

### Debugging Tools

#### Backend Debugging

```rust
// Enable detailed logging
#[post("/api/auth/login")]
pub async fn login(login_req: Json<LoginRequest>) -> Json<ApiResponse<()>> {
    tracing::info!("Login request: {:?}", login_req);
    
    let result = use_case.handle_login(login_req.into_inner()).await;
    
    match &result {
        Ok(command) => tracing::info!("Generated route command: {:?}", command),
        Err(e) => tracing::error!("Login failed: {}", e),
    }
    
    // ... handle result
}
```

#### Frontend Debugging

```javascript
// Route command execution tracking
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

Through this development guide, you should be able to successfully implement the backend-driven routing system. Remember to implement it progressively, starting with simple functionality and gradually expanding to more complex business scenarios.