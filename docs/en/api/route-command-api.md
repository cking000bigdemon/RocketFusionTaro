# Route Command API Specification

## Overview

The Route Command API is the core protocol of the backend-driven routing system, defining how the backend sends commands to the frontend to control user interface behavior. This document provides detailed descriptions of all supported route command types, data formats, and usage methods.

## API Response Format

### Basic Response Structure

All API responses follow a unified format:

```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "route_command": {
    "type": "CommandType",
    "payload": { /* command data */ }
  }
}
```

**Field Descriptions**:
- `code`: HTTP status code, 200 indicates success
- `message`: Response message, usually "success" or error description
- `data`: Business data, can be null
- `route_command`: Route command object, can be null

### Response Types

#### 1. Data-Only Response
```json
{
  "code": 200,
  "message": "success",
  "data": { "user_id": 123, "username": "admin" },
  "route_command": null
}
```

#### 2. Command-Only Response
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

#### 3. Data + Command Response
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

## Route Command Types

### 1. NavigateTo - Page Navigation

Used to control frontend page navigation.

#### Data Structure
```typescript
interface NavigateToPayload {
  path: string                        // Target page path
  params?: Record<string, any>        // URL query parameters
  replace?: boolean                   // Whether to replace current page in history
}
```

#### Examples

**Basic Navigation**:
```json
{
  "type": "NavigateTo",
  "payload": {
    "path": "/home"
  }
}
```

**Navigation with Parameters**:
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

**Replace Current Page**:
```json
{
  "type": "NavigateTo",
  "payload": {
    "path": "/login",
    "replace": true
  }
}
```

#### Frontend Implementation
```javascript
// Generated URL: /user/profile?user_id=123&tab=settings
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

### 2. ShowDialog - Display Dialog

Used to control the display of various types of dialogs on the frontend.

#### Data Structure
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

#### Examples

**Alert Dialog**:
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Alert",
    "title": "Operation Failed",
    "content": "Please check your network connection and try again",
    "actions": []
  }
}
```

**Confirm Dialog**:
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Confirm",
    "title": "Confirm Delete",
    "content": "This operation cannot be undone. Are you sure you want to delete?",
    "actions": [
      {
        "text": "Cancel",
        "action": null
      },
      {
        "text": "Confirm Delete",
        "action": {
          "type": "NavigateTo",
          "payload": { "path": "/deleted-success" }
        }
      }
    ]
  }
}
```

**Toast Message**:
```json
{
  "type": "ShowDialog",
  "payload": {
    "dialog_type": "Toast",
    "title": "",
    "content": "Saved successfully",
    "actions": []
  }
}
```

#### Frontend Implementation
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
        cancelText: actions[0]?.text || 'Cancel',
        confirmText: actions[1]?.text || 'Confirm'
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

### 3. ProcessData - Process Data

Used to update data in frontend state management.

#### Data Structure
```typescript
interface ProcessDataPayload {
  data_type: string                   // Data type identifier
  data: any                          // Data content
  merge?: boolean                    // Whether to merge with existing data
}
```

#### Examples

**Set User Information**:
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

**Update Partial User Information**:
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

**Set List Data**:
```json
{
  "type": "ProcessData",
  "payload": {
    "data_type": "userList",
    "data": [
      { "id": 1, "name": "John Doe" },
      { "id": 2, "name": "Jane Smith" }
    ]
  }
}
```

#### Frontend Implementation
```javascript
async handleProcessData({ data_type, data, merge }) {
  switch (data_type) {
    case 'user':
      if (merge) {
        this.store.updateUser(data)  // Merge update
      } else {
        this.store.setUser(data)     // Complete replacement
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

### 4. Sequence - Sequential Commands

Used to execute multiple route commands in sequence.

#### Data Structure
```typescript
interface SequencePayload {
  commands: RouteCommand[]
}
```

#### Examples

**Login Success Flow**:
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
          "content": "Login successful"
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

#### Frontend Implementation
```javascript
async handleSequence({ commands }) {
  for (const command of commands) {
    await this.execute(command)
    // Can add delays or other logic here
  }
}
```

### 5. Delay - Delayed Command Execution

Execute a command after a specified delay.

#### Data Structure
```typescript
interface DelayPayload {
  duration_ms: number               // Delay duration in milliseconds
  command: RouteCommand            // Command to execute after delay
}
```

#### Examples

**Delayed Navigation**:
```json
{
  "type": "Delay",
  "payload": {
    "duration_ms": 2000,
    "command": {
      "type": "NavigateTo",
      "payload": { "path": "/welcome" }
    }
  }
}
```

#### Frontend Implementation
```javascript
async handleDelay({ duration_ms, command }) {
  await new Promise(resolve => setTimeout(resolve, duration_ms))
  await this.execute(command)
}
```

### 6. Parallel - Parallel Command Execution

Execute multiple commands simultaneously.

#### Data Structure
```typescript
interface ParallelPayload {
  commands: RouteCommand[]         // Array of commands to execute
  wait_for_all: boolean           // Whether to wait for all commands to complete
}
```

#### Examples

**Parallel Data Updates**:
```json
{
  "type": "Parallel",
  "payload": {
    "commands": [
      {
        "type": "ProcessData",
        "payload": { "data_type": "user", "data": {...} }
      },
      {
        "type": "ProcessData", 
        "payload": { "data_type": "notifications", "data": [...] }
      }
    ],
    "wait_for_all": true
  }
}
```

#### Frontend Implementation
```javascript
async handleParallel({ commands, wait_for_all }) {
  const promises = commands.map(command => this.execute(command))
  
  if (wait_for_all) {
    await Promise.all(promises)
  } else {
    // Fire and forget
    promises.forEach(promise => {
      promise.catch(error => console.error('Parallel command failed:', error))
    })
  }
}
```

### 7. Retry - Command Retry with Backoff

Retry command execution with configurable attempts and delay.

#### Data Structure
```typescript
interface RetryPayload {
  command: RouteCommand            // Command to retry
  max_attempts: number             // Maximum retry attempts
  delay_ms: number                 // Base delay between attempts (exponential backoff)
}
```

#### Examples

**Retry Critical Navigation**:
```json
{
  "type": "Retry",
  "payload": {
    "command": {
      "type": "NavigateTo",
      "payload": { "path": "/critical-page" }
    },
    "max_attempts": 3,
    "delay_ms": 1000
  }
}
```

#### Frontend Implementation
```javascript
async handleRetry({ command, max_attempts, delay_ms }) {
  let lastError
  
  for (let attempt = 1; attempt <= max_attempts; attempt++) {
    try {
      await this.execute(command)
      return // Success, exit retry loop
    } catch (error) {
      lastError = error
      console.warn(`Attempt ${attempt} failed:`, error)
      
      if (attempt < max_attempts) {
        // Exponential backoff
        const backoffDelay = delay_ms * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
      }
    }
  }
  
  throw lastError // All attempts failed
}
```

### 8. Conditional - Conditional Commands

Execute different commands based on frontend state conditions.

#### Data Structure
```typescript
interface ConditionalPayload {
  condition: string                  // Condition expression
  if_true: RouteCommand             // Command to execute when condition is true
  if_false?: RouteCommand           // Command to execute when condition is false (optional)
}
```

#### Examples

**Navigate Based on User Type**:
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

#### Frontend Implementation
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
  // Simple condition evaluation implementation
  // In production, use a safer expression parser
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

## Error Handling

### Error Response Format

When API calls fail, route commands can still be returned to handle errors:

```json
{
  "code": 400,
  "message": "Invalid request",
  "data": null,
  "route_command": {
    "type": "ShowDialog",
    "payload": {
      "dialog_type": "Alert",
      "title": "Request Failed",
      "content": "Please check your input and try again"
    }
  }
}
```

### Error Command Types

#### General Error Handling
```json
{
  "type": "Sequence",
  "payload": {
    "commands": [
      {
        "type": "ShowDialog",
        "payload": {
          "dialog_type": "Alert",
          "title": "Operation Failed",
          "content": "System error, please try again later"
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

#### Authentication Failure Handling
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
          "content": "Session expired, please login again"
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

## Backend Implementation Example

### Rust Implementation

```rust
// Route command enum definition
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
    Delay {
        duration_ms: u64,
        command: Box<RouteCommand>,
    },
    Parallel {
        commands: Vec<RouteCommand>,
        wait_for_all: bool,
    },
    Retry {
        command: Box<RouteCommand>,
        max_attempts: u32,
        delay_ms: u64,
    },
    Conditional {
        condition: String,
        if_true: Box<RouteCommand>,
        if_false: Option<Box<RouteCommand>>,
    },
}

// Response builder
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

// Usage example
#[post("/api/users", data = "<user_data>")]
pub async fn create_user(user_data: Json<CreateUserRequest>) -> Json<ApiResponse<User>> {
    match user_service.create_user(user_data.into_inner()).await {
        Ok(user) => {
            Json(ApiResponse::with_navigation(user, "/users"))
        }
        Err(e) => {
            Json(ApiResponse::command_only(RouteCommand::ShowDialog {
                dialog_type: DialogType::Alert,
                title: "Creation Failed".to_string(),
                content: e.to_string(),
                actions: vec![],
            }))
        }
    }
}
```

## Best Practices

### 1. Command Naming Conventions

- Use PascalCase for command types: `NavigateTo`, `ShowDialog`
- Use snake_case for fields: `data_type`, `dialog_type`
- Keep command names concise and clear

### 2. Data Type Management

Recommend creating enums for common `data_type` values:

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

### 3. Command Composition Strategy

- Prioritize single commands
- Use `Sequence` to compose multiple commands when necessary
- Avoid overly deep nesting structures

### 4. Error Handling Consistency

- Unify error command formats
- Provide user-friendly error messages
- Include necessary error recovery commands

### 5. Version Compatibility

- Provide default handling for new command types
- Maintain backward compatibility
- Gradually deprecate old command types

## Versioned Route Commands (v2.0)

### Version Control System

Route commands now support version control with automatic fallback mechanisms:

#### Data Structure
```typescript
interface VersionedRouteCommand {
  version?: number                 // Command version (defaults to current)
  command: RouteCommand           // The actual route command
  fallback?: VersionedRouteCommand // Fallback command for incompatible versions
  metadata?: RouteCommandMetadata // Additional execution metadata
}

interface RouteCommandMetadata {
  timeout_ms?: number             // Command execution timeout
  priority?: number               // Execution priority (1-10)
  execution_context?: Record<string, any> // Additional context data
}
```

#### Examples

**Versioned Navigation with Fallback**:
```json
{
  "version": 200,
  "command": {
    "type": "NavigateTo",
    "payload": {
      "path": "/advanced-dashboard",
      "params": { "features": ["analytics", "reports"] }
    }
  },
  "fallback": {
    "version": 100,
    "command": {
      "type": "NavigateTo",
      "payload": { "path": "/dashboard" }
    }
  },
  "metadata": {
    "timeout_ms": 5000,
    "priority": 8
  }
}
```

### Frontend Version Handling

```javascript
class RouterHandler {
  constructor() {
    this.SUPPORTED_VERSION = 200 // Current client version
  }
  
  async execute(routeCommand) {
    if (this.isVersionedCommand(routeCommand)) {
      return this.executeVersionedCommand(routeCommand)
    }
    return this.executeCommand(routeCommand)
  }
  
  checkVersionCompatibility(serverVersion) {
    const serverMajor = Math.floor(serverVersion / 100)
    const clientMajor = Math.floor(this.SUPPORTED_VERSION / 100)
    return serverMajor === clientMajor
  }
  
  async executeVersionedCommand(versionedCommand) {
    const { version, command, fallback, metadata } = versionedCommand
    
    if (!this.checkVersionCompatibility(version)) {
      if (fallback) {
        console.log('Executing fallback due to version incompatibility')
        return this.execute(fallback)
      }
      throw new Error(`Unsupported command version: ${version}`)
    }
    
    // Set execution timeout if specified
    if (metadata?.timeout_ms) {
      return Promise.race([
        this.executeCommand(command),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Command timeout')), metadata.timeout_ms)
        )
      ])
    }
    
    return this.executeCommand(command)
  }
}
```

## Metrics and Observability Endpoints

### Error Reporting Endpoint

**POST /api/metrics/route-command-error**

Used by frontend to report route command execution errors for monitoring.

#### Request Format
```typescript
interface RouteCommandErrorMetric {
  execution_id: string            // Unique execution identifier
  command_type: string            // Type of command that failed
  error: string                   // Error message
  duration?: number               // Execution duration in milliseconds
  timestamp: string               // ISO timestamp
  user_agent: string              // Browser/client information
  url: string                     // Current page URL
}
```

#### Example Request
```json
{
  "execution_id": "exec_abc123",
  "command_type": "NavigateTo",
  "error": "Navigation failed: page not found",
  "duration": 1250.5,
  "timestamp": "2024-08-24T16:00:00Z",
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
  "url": "https://example.com/dashboard"
}
```

#### Response Format
```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "route_command": {
    "type": "ShowDialog",
    "payload": {
      "dialog_type": "Toast",
      "title": "",
      "content": "Error reported successfully"
    }
  }
}
```

### Performance Metrics Endpoint

**POST /api/metrics/performance**

Used to collect frontend performance metrics.

#### Request Format
```typescript
interface PerformanceMetric {
  metric_type: string                    // Type of performance metric
  value: number                         // Metric value
  tags: Record<string, string>          // Additional tags for categorization
  timestamp: string                     // ISO timestamp
}
```

#### Example Request
```json
{
  "metric_type": "route_command_duration",
  "value": 850.2,
  "tags": {
    "command_type": "Sequence",
    "commands_count": "3",
    "page": "/dashboard"
  },
  "timestamp": "2024-08-24T16:00:00Z"
}
```

### System Health Endpoint

**POST /api/metrics/health**

Provides system health status and component information.

#### Response Format
```typescript
interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  components: ComponentHealth[]
  version: string
}

interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  last_check: string
  details?: string
}
```

#### Example Response
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "healthy",
    "timestamp": "2024-08-24T16:00:00Z",
    "components": [
      {
        "name": "database",
        "status": "healthy",
        "last_check": "2024-08-24T16:00:00Z"
      },
      {
        "name": "redis",
        "status": "healthy", 
        "last_check": "2024-08-24T16:00:00Z"
      },
      {
        "name": "route_handler",
        "status": "healthy",
        "last_check": "2024-08-24T16:00:00Z",
        "details": "All route commands executing normally"
      }
    ],
    "version": "2.0.0"
  },
  "route_command": null
}
```

### Frontend Metrics Integration

```javascript
// Automatic error reporting (production only)
class RouterHandler {
  async execute(routeCommand) {
    const startTime = performance.now()
    const executionId = this.generateExecutionId()
    
    try {
      await this.executeCommand(routeCommand)
      
      // Report success metrics
      this.reportPerformanceMetric({
        metric_type: 'route_command_duration',
        value: performance.now() - startTime,
        tags: { command_type: routeCommand.type }
      })
      
    } catch (error) {
      // Automatic error reporting in production
      if (process.env.NODE_ENV === 'production') {
        await this.reportExecutionError({
          execution_id: executionId,
          command_type: routeCommand.type,
          error: error.message,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href
        })
      }
      throw error
    }
  }
  
  async reportExecutionError(errorMetric) {
    try {
      await fetch('/api/metrics/route-command-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorMetric)
      })
    } catch (reportError) {
      console.warn('Failed to report error metric:', reportError)
    }
  }
}
```

## Extension Commands

### Custom Command Examples

If you need to add new command types, you can extend the `RouteCommand` enum:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    // ... existing commands
    
    // New: Refresh page
    RefreshPage {
        preserve_scroll: Option<bool>,
    },
    
    // New: Call JS function
    CallFunction {
        function_name: String,
        parameters: Option<serde_json::Value>,
    },
    
    // New: Set theme
    SetTheme {
        theme: String,
    },
}
```

Corresponding frontend handling:

```javascript
async execute(routeCommand) {
  switch (routeCommand.type) {
    // ... existing handling
    
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

This extension mechanism ensures system scalability and flexibility, allowing new command types to be added based on business requirements.