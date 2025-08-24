# Backend-Driven Routing Architecture Design

## Overview

Backend-driven routing is a modern frontend-backend interaction architecture that transfers control of business processes from the frontend to the backend, achieving true centralized business logic management. In this architecture, the frontend is no longer responsible for complex business decisions but acts as an "executor" that responds to routing commands sent by the backend.

## Core Philosophy

### Traditional Frontend-Driven vs Backend-Driven

**Traditional Frontend-Driven Mode**:
```javascript
// Frontend needs to handle complex business logic
if (loginResponse.success) {
  if (user.isFirstLogin) {
    navigateTo('/onboarding')
  } else if (user.hasUnfinishedOrder) {
    navigateTo('/payment')
  } else if (user.isVIP) {
    navigateTo('/vip-dashboard')
  } else {
    navigateTo('/home')
  }
}
```

**Backend-Driven Mode**:
```javascript
// Frontend only needs to execute backend commands
const response = await api.login(credentials)
routerHandler.execute(response.data.routeCommand)
```

### Architecture Benefits

1. **Centralized Business Logic**: All business rules are managed by the backend
2. **Multi-Platform Consistency**: H5, Mini-Programs, and Apps execute the same business processes
3. **Dynamic Process Control**: Backend can adjust user experience flows in real-time
4. **Reduced Frontend Complexity**: Frontend focuses on UI presentation and user interaction
5. **Easy Testing and Maintenance**: Business logic testing is centralized on the backend

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client (Taro + React)"]
        direction TB
        UI["UI Component Layer<br/>(Pages & Components)"]
        Store["State Management<br/>(Zustand Store)"]
        APIService["API Service Layer<br>(services/api.js)"]
        RouterHandler["Router Handler<br>(routerHandler.js)<br/>- navigateTo()<br/>- showDialog()<br/>- updateStore()"]

        UI -- "1. User Interaction (e.g., form submission)" --> APIService
        APIService -- "2. Send network request" --> Network
        APIService -- "3. Receive raw response" --> RouterHandler
        RouterHandler -- "4a. Execute routing commands (navigate/dialog)" --> UI
        RouterHandler -- "4b. Dispatch data (update state)" --> Store
        Store -- "State changes" --> UI
    end

    subgraph Network["Network Transport (HTTPS)"]
        HTTPRequest["Request: POST /api/login<br/>{username, password}"]
        HTTPResponse["Response: ApiResponse<RouteCommand><br/>{<br/>code: 200,<br/>data: {<br/>type: 'NavigateTo',<br/>payload: {path: '/home'}<br/>}<br/>}"]
    end

    subgraph Server["Rust Rocket Backend Server"]
        direction TB
        Fairing["Global Middleware (Fairings)<br/>- CORS<br/>- Logging<br/>- Auth Guards"]
        Router["API Router<br/>- POST /api/login<br/>- POST /api/payment<br/>- GET /api/health"]
        StaticServer["Static File Service (FileServer)<br/>Serving frontend/dist"]

        subgraph CoreLogic["Core Business Logic Layer"]
            UseCase["Use Case Layer<br/>- Execute business rules<br/>- Access data<br/>- Make routing decisions"]
            RouteCommandGen["Route Command Generation<br/>(RouteCommand Enum)<br/>- NavigateTo<br/>- ShowDialog<br/>- ProcessData<br/>- RequestPayment"]
        end

        DataAccess["Data Access Layer<br/>- PostgreSQL Client<br/>- Redis Client"]
        DB["Database (PostgreSQL)"]
        Cache["Cache (Redis)"]

        Fairing --> Router
        Router --> UseCase
        UseCase --> DataAccess
        DataAccess --> DB
        DataAccess --> Cache
        UseCase --> RouteCommandGen
        RouteCommandGen --> HTTPResponse
    end

    HTTPRequest --> Router
    HTTPResponse --> APIService
```

## Core Component Design

### 1. Route Commands (RouteCommand)

Route commands are the core protocol for backend-frontend communication, defining the types of operations the frontend should execute and related data.

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    /// Page navigation
    NavigateTo {
        path: String,
        params: Option<serde_json::Value>,
        replace: Option<bool>,
    },
    
    /// Show dialog/popup
    ShowDialog {
        dialog_type: DialogType,
        title: String,
        content: String,
        actions: Vec<DialogAction>,
    },
    
    /// Process data (update state)
    ProcessData {
        data_type: String,
        data: serde_json::Value,
        merge: Option<bool>,
    },
    
    
    /// Composite command (execute multiple commands in sequence)
    Sequence {
        commands: Vec<RouteCommand>,
        stop_on_error: Option<bool>,
    },
    
    /// Conditional command (decide which command to execute based on frontend state)
    Conditional {
        condition: String,
        if_true: Box<RouteCommand>,
        if_false: Option<Box<RouteCommand>>,
    },
    
    /// Delay command (execute command after specified time)
    Delay {
        duration_ms: u64,
        command: Box<RouteCommand>,
    },
    
    /// Parallel command (execute multiple commands simultaneously)
    Parallel {
        commands: Vec<RouteCommand>,
        wait_for_all: bool,
    },
    
    /// Retry command (retry command execution with backoff)
    Retry {
        command: Box<RouteCommand>,
        max_attempts: u32,
        delay_ms: u64,
    },
}
```

### 2. Use Case Layer

The use case layer is the core of business logic, responsible for handling business rules and generating corresponding route commands.

```rust
pub trait UseCase<Input, Output> {
    async fn execute(&self, input: Input) -> Result<RouteCommand, UseCaseError>;
}

pub struct AuthUseCase {
    db_pool: Arc<DbPool>,
    redis_pool: Arc<RedisPool>,
}

impl UseCase<LoginRequest, LoginResponse> for AuthUseCase {
    async fn execute(&self, request: LoginRequest) -> Result<RouteCommand, UseCaseError> {
        // 1. Validate user credentials
        let user = self.authenticate_user(&request).await?;
        
        // 2. Create session
        let session = self.create_session(&user).await?;
        
        // 3. Determine next action
        let route_command = self.determine_next_action(&user).await?;
        
        Ok(route_command)
    }
}

impl AuthUseCase {
    async fn determine_next_action(&self, user: &User) -> Result<RouteCommand, UseCaseError> {
        if user.is_first_login {
            Ok(RouteCommand::NavigateTo {
                path: "/onboarding".to_string(),
                params: None,
                replace: Some(true),
            })
        } else if self.has_unfinished_order(user).await? {
            Ok(RouteCommand::NavigateTo {
                path: "/payment".to_string(),
                params: Some(json!({"order_id": user.last_order_id})),
                replace: Some(true),
            })
        } else {
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
}
```

### 3. Frontend Router Handler

The frontend router handler is responsible for parsing and executing route commands sent by the backend.

```javascript
class RouterHandler {
    constructor(store) {
        this.store = store
    }

    async execute(routeCommand) {
        switch (routeCommand.type) {
            case 'NavigateTo':
                return this.handleNavigateTo(routeCommand.payload)
            
            case 'ShowDialog':
                return this.handleShowDialog(routeCommand.payload)
            
            case 'ProcessData':
                return this.handleProcessData(routeCommand.payload)
            
            
            case 'Sequence':
                return this.handleSequence(routeCommand.payload)
            
            case 'Conditional':
                return this.handleConditional(routeCommand.payload)
            
            default:
                console.warn('Unknown route command type:', routeCommand.type)
        }
    }

    async handleNavigateTo({ path, params, replace }) {
        const url = params ? `${path}?${new URLSearchParams(params)}` : path
        
        if (replace) {
            await Taro.redirectTo({ url })
        } else {
            await Taro.navigateTo({ url })
        }
    }

    async handleProcessData({ data_type, data, merge }) {
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
        for (const command of commands) {
            await this.execute(command)
        }
    }
}
```

## Data Flow Details

### Complete User Login Flow

1. **User Interaction**: User enters username and password on the login page and clicks the login button

2. **API Call**: Frontend calls the login API
   ```javascript
   const response = await api.post('/api/auth/login', { username, password })
   ```

3. **Backend Processing**:
   - Router layer receives the request
   - Calls `AuthUseCase.execute()`
   - Validates user credentials
   - Creates user session
   - Determines next action based on user state
   - Generates corresponding `RouteCommand`

4. **Response Generation**:
   ```json
   {
     "code": 200,
     "message": "success",
     "data": {
       "type": "Sequence",
       "payload": {
         "commands": [
           {
             "type": "ProcessData",
             "payload": {
               "data_type": "user",
               "data": { "id": 1, "username": "admin", "email": "admin@example.com" },
               "merge": false
             }
           },
           {
             "type": "NavigateTo",
             "payload": {
               "path": "/home",
               "params": null,
               "replace": true
             }
           }
         ]
       }
     }
   }
   ```

5. **Frontend Execution**:
   - API service layer receives response
   - Passes `RouteCommand` to router handler
   - Router handler parses and executes command sequence:
     - Updates user state to Store
     - Navigates to home page


## Architecture Enhancements v2.0 (August 2024)

### Version Control and Compatibility System

The architecture now supports versioned route commands with automatic fallback mechanisms:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionedRouteCommand {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(flatten)]
    pub command: RouteCommand,
    pub fallback: Option<Box<VersionedRouteCommand>>,
    #[serde(default)]
    pub metadata: RouteCommandMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteCommandMetadata {
    pub timeout_ms: Option<u64>,
    pub priority: Option<u8>,
    pub execution_context: HashMap<String, serde_json::Value>,
}
```

#### Version Compatibility Checking

The frontend automatically validates command versions:

```javascript
class RouterHandler {
    checkVersionCompatibility(serverVersion) {
        const serverMajor = Math.floor(serverVersion / 100)
        const clientMajor = Math.floor(ROUTE_COMMAND_VERSION / 100)
        return serverMajor === clientMajor
    }
    
    async executeVersionedCommand(versionedCommand) {
        const { version, command, fallback } = versionedCommand
        
        if (!this.checkVersionCompatibility(version)) {
            if (fallback) {
                console.log('Executing fallback command due to version incompatibility')
                await this.execute(fallback)
                return
            }
            throw new Error(`Unsupported route command version: ${version}`)
        }
        
        await this.executeCommand(command)
    }
}
```

### Enhanced Command Types

#### 1. Delay Command
Execute commands with precise timing control:

```rust
RouteCommand::Delay {
    duration_ms: 2000,
    command: Box::new(RouteCommand::NavigateTo {
        path: "/delayed-page".to_string(),
        params: None,
        replace: None,
    }),
}
```

#### 2. Parallel Command
Execute multiple commands simultaneously:

```rust
RouteCommand::Parallel {
    commands: vec![
        RouteCommand::ProcessData { /* update user */ },
        RouteCommand::ProcessData { /* update notifications */ },
        RouteCommand::ProcessData { /* update settings */ },
    ],
    wait_for_all: true,
}
```

#### 3. Retry Command
Automatic retry with exponential backoff:

```rust
RouteCommand::Retry {
    command: Box::new(RouteCommand::NavigateTo {
        path: "/critical-page".to_string(),
        params: None,
        replace: None,
    }),
    max_attempts: 3,
    delay_ms: 1000,
}
```

#### 4. Enhanced Conditional Command
Runtime condition evaluation with safe expression parsing:

```rust
RouteCommand::Conditional {
    condition: "user && user.is_admin".to_string(),
    if_true: Box::new(RouteCommand::NavigateTo {
        path: "/admin-dashboard".to_string(),
        params: None,
        replace: Some(true),
    }),
    if_false: Some(Box::new(RouteCommand::NavigateTo {
        path: "/user-dashboard".to_string(),
        params: None,
        replace: Some(true),
    })),
}
```

### Business Logic Separation

#### RouteCommandGenerator Pattern

```rust
pub struct RouteCommandGenerator;

impl RouteCommandGenerator {
    #[instrument(skip_all)]
    pub fn generate_login_route_command(result: &LoginResult) -> RouteCommand {
        info!(user_id = %result.user.id, "Generating login route command");
        
        if result.is_first_login {
            RouteCommand::Sequence {
                commands: vec![
                    RouteCommand::ProcessData {
                        data_type: "user".to_string(),
                        data: serde_json::to_value(&result.user).unwrap(),
                        merge: Some(false),
                    },
                    RouteCommand::NavigateTo {
                        path: "/onboarding".to_string(),
                        params: None,
                        replace: Some(true),
                    },
                ],
                stop_on_error: Some(true),
            }
        } else {
            // Normal login flow...
        }
    }
}
```

#### Pure Use Case Pattern

```rust
impl AuthUseCase {
    /// Pure business logic - returns business result
    pub async fn execute_login(&self, request: LoginRequest) -> UseCaseResult<LoginResult> {
        // Business logic implementation...
        let login_result = LoginResult::new(user, session)
            .with_pending_tasks(pending_tasks)
            .with_account_flags(flags);
            
        Ok(login_result)
    }
    
    /// Route command generation - separate concern
    pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
        match self.execute_login(request).await {
            Ok(login_result) => {
                Ok(RouteCommandGenerator::generate_login_route_command(&login_result))
            }
            Err(e) => {
                Ok(RouteCommandGenerator::generate_error_route_command(&e.to_string(), None))
            }
        }
    }
}
```

### Global Request Interceptor

The frontend now automatically processes route commands from all API responses:

```javascript
const request = async (url, options = {}) => {
    const response = await Taro.request(requestConfig)
    
    if (response.statusCode === 200) {
        const responseData = response.data
        
        // 🚀 Global route command interceptor
        if (responseData && typeof responseData === 'object') {
            const routeCommand = responseData.route_command || responseData.routeCommand
            
            if (routeCommand) {
                // Asynchronous execution without blocking current request
                setTimeout(async () => {
                    try {
                        const store = useStore.getState()
                        const routerHandler = store.getRouterHandler()
                        
                        if (routerHandler) {
                            await routerHandler.execute(routeCommand)
                        }
                    } catch (routeError) {
                        console.error('Failed to execute route command:', routeError)
                    }
                }, 0)
            }
        }
        
        return responseData
    }
}
```

### Enhanced Observability

#### Execution Tracking

```javascript
class RouterHandler {
    async execute(routeCommand) {
        const executionId = this.generateExecutionId()
        const startTime = performance.now()
        
        try {
            await this.executeCommand(routeCommand, executionId)
            
            const duration = performance.now() - startTime
            this.recordExecution(executionId, routeCommand, 'success', null, { duration })
            
        } catch (error) {
            const duration = performance.now() - startTime
            this.recordExecution(executionId, routeCommand, 'error', error.message, { duration })
            
            // Automatic error reporting in production
            if (process.env.NODE_ENV === 'production') {
                this.reportExecutionMetrics({
                    executionId,
                    commandType: routeCommand.type,
                    error: error.message,
                    duration,
                    timestamp: new Date().toISOString()
                })
            }
        }
    }
    
    getExecutionStats() {
        const total = this.executionHistory.length
        const successful = this.executionHistory.filter(r => r.status === 'success').length
        const failed = this.executionHistory.filter(r => r.status === 'error').length
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
            avgDuration: this.calculateAverageDuration(),
            commandTypes: this.getCommandTypeDistribution()
        }
    }
}
```

#### Backend Metrics Collection

```rust
// New metrics endpoints
#[post("/api/metrics/route-command-error", data = "<metric>")]
pub async fn receive_route_command_error_metric(
    metric: Json<RouteCommandErrorMetric>,
) -> Json<ApiResponse<()>> {
    error!(
        execution_id = %metric.execution_id,
        command_type = %metric.command_type,
        error_message = %metric.error,
        "Frontend route command execution error received"
    );
    
    // Process metric for monitoring and alerting
    Json(ApiResponse::with_toast((), "Metric recorded"))
}

#[post("/api/metrics/health")]
pub async fn get_system_health() -> Json<ApiResponse<SystemHealthStatus>> {
    let health_status = SystemHealthStatus {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now(),
        components: vec![
            ComponentHealth {
                name: "route_handler".to_string(),
                status: "healthy".to_string(),
                details: Some("All route commands executing normally".to_string()),
            },
        ],
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    
    Json(ApiResponse::success(health_status))
}
```

### Multi-Level Fallback System

#### Command-Level Fallbacks
```rust
VersionedRouteCommand {
    version: 200,
    command: RouteCommand::NavigateTo { /* advanced navigation */ },
    fallback: Some(Box::new(VersionedRouteCommand {
        version: 100,
        command: RouteCommand::NavigateTo { /* basic navigation */ },
        fallback: None,
    })),
}
```

#### Execution-Level Fallbacks
```javascript
async handleExecutionError(originalCommand, error, executionId) {
    const fallbackEntry = this.fallbackStack.find(entry => entry.executionId === executionId)
    
    if (fallbackEntry) {
        console.log(`Executing fallback command due to error`)
        try {
            await this.execute(fallbackEntry.fallback)
        } catch (fallbackError) {
            this.showGenericError()
        }
    }
}
```

## Architecture Comparison Analysis

### Problems with Traditional Architecture

1. **Scattered Business Logic**: Both frontend and backend have business logic
2. **Multi-Platform Inconsistency**: H5 and mini-programs may have different business flows
3. **Maintenance Difficulties**: Business rule changes require modifying both frontend and backend
4. **Complex Testing**: Need to test business logic separately on frontend and backend

### Advantages of Backend-Driven Architecture

1. **Unified Business Control**: All business decisions are made on the backend
2. **Strong Consistency**: All platforms execute the same business processes
3. **Flexible Process Control**: Backend can dynamically adjust user experience
4. **Simplified Frontend Logic**: Frontend focuses on UI and interaction
5. **Centralized Testing Strategy**: Main business logic testing is completed on the backend

## Implementation Considerations

### 1. Progressive Migration

It's not recommended to refactor the entire system at once. A module-by-module approach is suggested:

1. First select a relatively independent functional module (such as user authentication)
2. Implement a complete backend-driven process
3. Validate effectiveness before gradually expanding to other modules

### 2. Error Handling Strategy

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorRouteCommand {
    pub error_code: String,
    pub error_message: String,
    pub fallback_command: Option<RouteCommand>,
}
```

### 3. Debugging and Monitoring

- Provide detailed route command logs in development environment
- Implement execution chain tracking for route commands
- Establish consistency validation mechanisms for frontend-backend route commands

### 4. Performance Considerations

- Use `Sequence` commands reasonably, avoid overly long command chains
- Cache frequently used route commands
- Implement batch execution optimization for route commands

## Summary

Backend-driven routing architecture is a future-oriented system design philosophy that achieves true unified business logic management by centralizing business control to the backend. This architecture is particularly suitable for:

- Multi-platform applications (H5, Mini-Programs, Apps)
- Complex business processes (payments, approvals, etc.)
- Products that need frequent user experience adjustments
- Systems with high consistency requirements

Through proper design and implementation, this architecture can significantly improve development efficiency, system maintainability, and user experience consistency.