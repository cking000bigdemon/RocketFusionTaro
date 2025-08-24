# Development Guide

## Development Environment Setup

### Required Tool Installation

#### 1. Rust Environment
```bash
# Install Rust (using official installation script)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows users use MSVC toolchain
rustup default stable-x86_64-pc-windows-msvc
```

#### 2. Node.js Environment
- Download link: https://nodejs.org/
- Recommended version: 16.x LTS or higher
- Verify installation:
```bash
node --version
npm --version
```

#### 3. Taro CLI (Optional)
```bash
# Install Taro CLI globally
npm install -g @tarojs/cli
```

### Project Initialization

#### 1. Clone Project
```bash
git clone [project_url]
cd Rocket
```

#### 2. Install Dependencies
```bash
# Backend dependencies (handled automatically)
cd rocket-taro-server

# Frontend dependencies
cd ../frontend
npm install
```

## Development Workflow

### Backend Development

#### 1. Start Development Server
```bash
cd rocket-taro-server
cargo run
```

The server will start on `http://localhost:8000` by default.

#### 2. Backend-Driven Routing Development (v2.0)

The system now uses advanced backend-driven routing with version control:

```bash
# Enable structured logging for route commands
export RUST_LOG=info,rocket_taro_server::use_cases=debug

# Start with observability features
cargo run --features observability
```

**Route Command Development Workflow:**

1. **Define Business Logic** in use cases:
```rust
// src/use_cases/example_use_case.rs
pub async fn handle_user_action(&self, request: ActionRequest) -> UseCaseResult<RouteCommand> {
    // Business logic implementation
    let result = self.execute_business_logic(request).await?;
    
    // Generate appropriate route command
    Ok(RouteCommandGenerator::generate_action_command(&result))
}
```

2. **Generate Route Commands** with version support:
```rust
// Use RouteCommandGenerator for consistent command generation
RouteCommandGenerator::generate_versioned_command(
    &business_result,
    client_version,
    Some(fallback_command)
)
```

3. **Test Route Command Execution** in frontend:
```bash
# Frontend will automatically execute route commands from API responses
# Check browser console for execution logs in development mode
```

#### 3. Code Quality Checks
```bash
# Code format check
cargo fmt --check

# Code quality check
cargo clippy

# Unit tests
cargo test
```

#### 4. Database Operations
```bash
# Check database connection
cargo run -- --check-db

# Reset database (development only)
cargo run -- --reset-db
```

### Frontend Development

#### 1. Web Development
```bash
cd frontend
npm run dev:h5
```

Access at `http://localhost:10086`.

**Frontend Route Command Development:**

The frontend now features an advanced RouterHandler with observability:

```javascript
// Check RouterHandler execution statistics in development
const stats = routerHandler.getExecutionStats()
console.log('Route Handler Performance:', {
    successRate: stats.successRate,
    avgDuration: `${stats.avgDuration}ms`,
    commandTypes: stats.commandTypes
})

// Export execution history for debugging
routerHandler.exportExecutionHistory() // Downloads JSON file

// Test error handling
routerHandler.simulateError('NavigateTo') // Simulates command execution error
```

#### 2. WeChat Mini Program Development
```bash
cd frontend
npm run dev:weapp
```

Open the `dist` directory in WeChat Developer Tools.

#### 3. Production Build
```bash
# Web build
npm run build:h5

# WeChat Mini Program build
npm run build:weapp
```

## Code Standards

### Rust Code Standards

#### 1. Naming Conventions
- **Variables/Functions**: snake_case
- **Types/Structs**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Modules**: snake_case

#### 2. Error Handling
```rust
// Use Result type for error handling
pub async fn get_user(id: Uuid) -> Result<User, DatabaseError> {
    // Implementation
}

// Use ? operator for error propagation
let user = database::get_user(id).await?;
```

#### 3. Documentation
```rust
/// Gets user information by ID
/// 
/// # Arguments
/// 
/// * `id` - User's unique identifier
/// 
/// # Returns
/// 
/// Returns user information or error
pub async fn get_user(id: Uuid) -> Result<User, DatabaseError> {
    // Implementation
}
```

### Frontend Code Standards

#### 1. Component Organization
```javascript
// Functional component with hooks
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'

const UserProfile = () => {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    // Component logic
  }, [])
  
  return (
    <View className="user-profile">
      {/* Component content */}
    </View>
  )
}

export default UserProfile
```

#### 2. State Management
```javascript
// Use Zustand for state management
import { create } from 'zustand'

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
```

## Testing Strategy

### Backend Testing

#### 1. Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_user_authentication() {
        // Test implementation
    }
    
    #[tokio::test]
    async fn test_route_command_generation() {
        let use_case = AuthUseCase::new();
        let request = LoginRequest { username: "test".to_string(), password: "test".to_string() };
        
        let command = use_case.handle_login(request).await.unwrap();
        assert!(matches!(command, RouteCommand::Sequence { .. }));
    }
}
```

#### 1.5. Route Command Testing (v2.0)

Test route command generation and version compatibility:

```rust
#[cfg(test)]
mod route_command_tests {
    use super::*;
    use crate::models::route_command::*;
    
    #[test]
    fn test_version_compatibility_checking() {
        let handler = RouterHandler::new();
        
        // Test major version compatibility
        assert!(handler.check_version_compatibility(200)); // v2.0.x
        assert!(!handler.check_version_compatibility(300)); // v3.0.x
    }
    
    #[tokio::test]
    async fn test_fallback_command_execution() {
        let versioned_command = VersionedRouteCommand {
            version: 300, // Unsupported version
            command: RouteCommand::NavigateTo {
                path: "/advanced-page".to_string(),
                params: None,
                replace: None,
            },
            fallback: Some(Box::new(VersionedRouteCommand {
                version: 200,
                command: RouteCommand::NavigateTo {
                    path: "/basic-page".to_string(),
                    params: None,
                    replace: None,
                },
                fallback: None,
                metadata: RouteCommandMetadata::default(),
            })),
            metadata: RouteCommandMetadata::default(),
        };
        
        // Should execute fallback for unsupported version
        let result = handler.execute_versioned_command(versioned_command).await;
        assert!(result.is_ok());
    }
}
```

#### 2. Integration Tests
```rust
// tests/integration_test.rs
use rocket::testing::launch;
use rocket::http::{Status, ContentType};

#[rocket::async_test]
async fn test_login_endpoint() {
    let client = Client::tracked(rocket()).await.expect("valid rocket instance");
    let response = client
        .post("/api/auth/login")
        .header(ContentType::JSON)
        .body(r#"{"username": "test", "password": "test"}"#)
        .dispatch()
        .await;
    
    assert_eq!(response.status(), Status::Ok);
}
```

### Frontend Testing

#### 1. Component Tests
```javascript
import { render, screen } from '@testing-library/react'
import UserProfile from '../UserProfile'

describe('UserProfile', () => {
  test('renders user information', () => {
    render(<UserProfile user={mockUser} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
```

#### 2. Route Command Handler Testing (v2.0)

Test the RouterHandler functionality and command execution:

```javascript
import { RouterHandler } from '../utils/routerHandler'

describe('RouterHandler', () => {
  let routerHandler
  let mockStore
  
  beforeEach(() => {
    mockStore = {
      setUser: jest.fn(),
      updateUser: jest.fn(),
      setUserList: jest.fn()
    }
    routerHandler = new RouterHandler(mockStore)
  })
  
  test('executes NavigateTo command', async () => {
    const command = {
      type: 'NavigateTo',
      payload: { path: '/home', params: { welcome: true }, replace: true }
    }
    
    // Mock Taro navigation
    const mockRedirectTo = jest.fn().mockResolvedValue(true)
    global.Taro = { redirectTo: mockRedirectTo }
    
    await routerHandler.execute(command)
    expect(mockRedirectTo).toHaveBeenCalledWith({ url: '/home?welcome=true' })
  })
  
  test('handles ProcessData command with merge', async () => {
    const command = {
      type: 'ProcessData',
      payload: { 
        data_type: 'user', 
        data: { name: 'John' }, 
        merge: true 
      }
    }
    
    await routerHandler.execute(command)
    expect(mockStore.updateUser).toHaveBeenCalledWith({ name: 'John' })
  })
  
  test('executes Sequence commands in order', async () => {
    const command = {
      type: 'Sequence',
      payload: {
        commands: [
          { type: 'ProcessData', payload: { data_type: 'user', data: { id: 1 } } },
          { type: 'NavigateTo', payload: { path: '/dashboard' } }
        ]
      }
    }
    
    const executeSpy = jest.spyOn(routerHandler, 'execute')
    await routerHandler.execute(command)
    
    expect(executeSpy).toHaveBeenCalledTimes(3) // Original + 2 sub-commands
  })
  
  test('version compatibility checking', () => {
    // Test version compatibility logic
    expect(routerHandler.checkVersionCompatibility(200)).toBe(true)  // Same major
    expect(routerHandler.checkVersionCompatibility(210)).toBe(true)  // Newer minor
    expect(routerHandler.checkVersionCompatibility(190)).toBe(false) // Older minor
    expect(routerHandler.checkVersionCompatibility(300)).toBe(false) // Different major
  })
  
  test('fallback command execution on version mismatch', async () => {
    const versionedCommand = {
      version: 300, // Unsupported
      command: { type: 'NavigateTo', payload: { path: '/advanced' } },
      fallback: {
        version: 200,
        command: { type: 'NavigateTo', payload: { path: '/basic' } }
      }
    }
    
    const mockNavigateTo = jest.fn().mockResolvedValue(true)
    global.Taro = { navigateTo: mockNavigateTo }
    
    await routerHandler.executeVersionedCommand(versionedCommand)
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/basic' })
  })
  
  test('execution statistics tracking', async () => {
    // Execute some commands
    await routerHandler.execute({ type: 'NavigateTo', payload: { path: '/test1' } })
    await routerHandler.execute({ type: 'ProcessData', payload: { data_type: 'user', data: {} } })
    
    const stats = routerHandler.getExecutionStats()
    expect(stats.total).toBe(2)
    expect(stats.successful).toBe(2)
    expect(stats.successRate).toBe('100.00%')
    expect(stats.commandTypes).toHaveProperty('NavigateTo', 1)
    expect(stats.commandTypes).toHaveProperty('ProcessData', 1)
  })
  
  test('error handling and reporting', async () => {
    // Mock a failing command
    const failingCommand = { type: 'UnknownCommand', payload: {} }
    
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    try {
      await routerHandler.execute(failingCommand)
    } catch (error) {
      // Expected to throw for unknown command
    }
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown route command type:', 'UnknownCommand')
    consoleWarnSpy.mockRestore()
  })
})

// Performance testing
describe('RouterHandler Performance', () => {
  test('performance test execution', async () => {
    const routerHandler = new RouterHandler(mockStore)
    
    // Mock successful execution
    jest.spyOn(routerHandler, 'executeCommand').mockResolvedValue(true)
    
    const results = await routerHandler.performanceTest(10)
    
    expect(results).toHaveProperty('avg')
    expect(results).toHaveProperty('min')
    expect(results).toHaveProperty('max')
    expect(results.results).toHaveLength(10)
  })
})
```

## Debugging Guide

### Backend Debugging

#### 1. Logging Configuration
```rust
// Set log level
export RUST_LOG=debug

// View specific module logs
export RUST_LOG=rocket_taro_server::auth=debug

// Enable route command debugging (v2.0)
export RUST_LOG=rocket_taro_server::use_cases=debug,rocket_taro_server::models::route_command=trace

// Enable observability tracing
export RUST_LOG=info,rocket_taro_server=debug,tracing=info
```

#### 1.5. Route Command Debugging (v2.0)

Debug route command generation and execution:

```bash
# Enable structured logging with execution IDs
export RUST_LOG="rocket_taro_server::use_cases=debug,rocket_taro_server::routes=info"

# Check route command generation logs
tail -f /var/log/app.log | grep "route_command"

# Monitor route command error metrics
curl -X POST http://localhost:8000/api/metrics/health | jq '.data.components[] | select(.name == "route_handler")'
```

**Debug Route Command Issues:**

```rust
// Add debug logging in use cases
#[instrument(skip_all, name = "debug_login_flow")]
pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
    debug!("Login request received for user: {}", request.username);
    
    match self.execute_login(request).await {
        Ok(login_result) => {
            let command = RouteCommandGenerator::generate_login_route_command(&login_result);
            debug!("Generated route command: {:?}", command);
            Ok(command)
        }
        Err(e) => {
            error!("Login failed: {}", e);
            Ok(RouteCommandGenerator::generate_error_route_command(&e.to_string(), None))
        }
    }
}
```

#### 2. Database Debugging
```bash
# Connect to database directly
psql -h 192.168.5.222 -p 5432 -U user_ck -d postgres

# View active sessions
SELECT * FROM user_sessions WHERE expires_at > NOW();

# View login logs
SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 10;
```

### Frontend Debugging

#### 1. Browser DevTools
- Use browser developer tools for debugging
- Check network requests and responses
- Use React DevTools for component inspection

#### 1.5. Route Command Debugging (v2.0)

Debug frontend route command execution:

```javascript
// Enable route command debugging in development
if (process.env.NODE_ENV === 'development') {
    // Log all route command executions
    const originalExecute = routerHandler.execute
    routerHandler.execute = async function(command) {
        console.group(`🚀 Executing Route Command: ${command.type}`)
        console.log('Command payload:', command.payload)
        console.time('Execution time')
        
        try {
            const result = await originalExecute.call(this, command)
            console.log('✅ Command executed successfully')
            return result
        } catch (error) {
            console.error('❌ Command execution failed:', error)
            throw error
        } finally {
            console.timeEnd('Execution time')
            console.groupEnd()
        }
    }
}

// Debug route handler statistics
console.log('📊 Route Handler Stats:', routerHandler.getExecutionStats())

// Monitor execution history
setInterval(() => {
    const history = routerHandler.executionHistory
    console.log(`Route commands executed: ${history.length}`)
    
    const recentErrors = history.filter(h => 
        h.status === 'error' && 
        Date.now() - new Date(h.timestamp).getTime() < 60000 // Last minute
    )
    
    if (recentErrors.length > 0) {
        console.warn(`Recent errors: ${recentErrors.length}`)
        console.table(recentErrors)
    }
}, 30000) // Every 30 seconds
```

**Debug Version Compatibility Issues:**

```javascript
// Check version compatibility
const checkCompatibility = (serverVersion) => {
    const compatible = routerHandler.checkVersionCompatibility(serverVersion)
    console.log(`Version compatibility check:`, {
        clientVersion: routerHandler.SUPPORTED_VERSION,
        serverVersion,
        compatible
    })
    
    if (!compatible) {
        console.warn('Version incompatibility detected!')
        console.log('Fallback usage stats:', routerHandler.fallbackStack)
    }
}

// Test fallback mechanisms
const testFallback = async () => {
    const versionedCommand = {
        version: 999, // Intentionally unsupported
        command: { type: 'NavigateTo', payload: { path: '/test' } },
        fallback: {
            version: 200,
            command: { type: 'NavigateTo', payload: { path: '/fallback' } }
        }
    }
    
    try {
        await routerHandler.executeVersionedCommand(versionedCommand)
        console.log('✅ Fallback mechanism working correctly')
    } catch (error) {
        console.error('❌ Fallback mechanism failed:', error)
    }
}
```

#### 2. WeChat Developer Tools
- Use built-in debugger for mini program development
- Check console logs and network requests
- Use simulation tools for testing

## Performance Optimization

### Backend Optimization

#### 1. Database Optimization
- Use connection pooling
- Implement query result caching
- Optimize SQL queries

#### 2. API Response Optimization
```rust
// Use async/await for concurrent operations
let (user, sessions) = tokio::try_join!(
    get_user(id),
    get_user_sessions(id)
)?;
```

### Frontend Optimization

#### 1. Bundle Optimization
```javascript
// Webpack optimization in config/index.js
webpackChain(chain) {
  chain.optimization.splitChunks({
    chunks: 'all',
    cacheGroups: {
      vendor: {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        priority: 10,
      },
    },
  })
}
```

#### 2. Component Optimization
```javascript
// Use React.memo for component optimization
import { memo } from 'react'

const UserItem = memo(({ user }) => {
  return <View>{user.name}</View>
})
```

## Deployment Guide

### Production Build

#### 1. Backend Build
```bash
cd rocket-taro-server
cargo build --release
```

#### 2. Frontend Build
```bash
cd frontend
npm run build:h5
npm run build:weapp
```

### Environment Configuration

#### 1. Production Configuration
```toml
# Rocket.toml
[production]
address = "0.0.0.0"
port = 8000
keep_alive = 5
limits = { form = "64 kB", json = "1 MiB" }
secret_key = "your_production_secret_key"

[production.databases]
main = { url = "postgresql://user:pass@host:port/db" }
```

#### 2. Environment Variables
```bash
# Set production environment variables
export ROCKET_PROFILE=production
export DATABASE_URL="your_production_db_url"
export REDIS_URL="your_production_redis_url"
```

## Common Issues and Solutions

### Backend Issues

#### 1. Compilation Errors
```bash
# Update toolchain
rustup update

# Clean and rebuild
cargo clean
cargo build
```

#### 2. Database Connection Issues
- Check database service status
- Verify connection parameters
- Check firewall settings

### Frontend Issues

#### 1. Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### 2. Platform-specific Issues
- Check Taro version compatibility
- Verify platform-specific configurations
- Update dependencies to latest versions

## Development Best Practices

### 1. Version Control
- Use meaningful commit messages
- Create feature branches for new development
- Regularly sync with main branch

### 2. Code Review
- All code changes require review before merging
- Focus on code quality and security
- Ensure tests pass before merging

### 3. Documentation
- Update documentation with code changes
- Maintain API documentation
- Document architectural decisions

### 4. Security
- Never commit sensitive information
- Use environment variables for configuration
- Regularly update dependencies

### 5. Monitoring
- Implement logging for important operations
- Monitor application performance
- Set up error tracking and alerting

### 6. Backend-Driven Routing Best Practices (v2.0)

#### Route Command Development
```rust
// ✅ Good: Separate business logic from route command generation
impl AuthUseCase {
    // Pure business logic
    pub async fn execute_login(&self, request: LoginRequest) -> UseCaseResult<LoginResult> {
        // Business logic implementation
        Ok(login_result)
    }
    
    // Route command generation (separate concern)
    pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
        match self.execute_login(request).await {
            Ok(result) => Ok(RouteCommandGenerator::generate_login_command(&result)),
            Err(e) => Ok(RouteCommandGenerator::generate_error_command(&e.to_string()))
        }
    }
}

// ❌ Bad: Mixing business logic with route commands
impl AuthUseCase {
    pub async fn handle_login(&self, request: LoginRequest) -> UseCaseResult<RouteCommand> {
        // Business logic mixed with route command generation - avoid this!
    }
}
```

#### Version Compatibility Guidelines
```rust
// ✅ Always provide fallback commands for new features
pub fn generate_advanced_navigation(path: &str, client_version: u32) -> VersionedRouteCommand {
    VersionedRouteCommand {
        version: 200,
        command: RouteCommand::NavigateTo {
            path: path.to_string(),
            params: Some(json!({"animation": "slide", "preload": true})),
            replace: None,
        },
        fallback: Some(Box::new(VersionedRouteCommand {
            version: 100,
            command: RouteCommand::NavigateTo {
                path: path.to_string(),
                params: None,
                replace: None,
            },
            fallback: None,
            metadata: RouteCommandMetadata::default(),
        })),
        metadata: RouteCommandMetadata::default(),
    }
}

// ✅ Use feature flags for gradual rollout
pub fn determine_feature_availability(client_version: u32) -> FeatureFlags {
    FeatureFlags {
        advanced_navigation: client_version >= 150,
        parallel_commands: client_version >= 200,
        retry_mechanism: client_version >= 200,
        conditional_logic: client_version >= 200,
    }
}
```

#### Frontend Route Handler Best Practices
```javascript
// ✅ Good: Comprehensive error handling with fallbacks
class RouterHandler {
    async execute(routeCommand) {
        const executionId = this.generateExecutionId()
        
        try {
            await this.executeCommand(routeCommand, executionId)
            this.recordSuccess(executionId, routeCommand)
        } catch (error) {
            this.recordError(executionId, routeCommand, error)
            
            // Attempt fallback execution
            if (routeCommand.fallback) {
                try {
                    await this.execute(routeCommand.fallback)
                } catch (fallbackError) {
                    this.handleUltimateFailure(routeCommand, fallbackError)
                }
            }
            
            throw error
        }
    }
}

// ✅ Good: Performance monitoring
routerHandler.getExecutionStats() // Monitor success rates and performance

// ✅ Good: Version compatibility checking
if (!routerHandler.checkVersionCompatibility(serverVersion)) {
    // Handle incompatibility gracefully
}
```

#### Testing Best Practices
```rust
// ✅ Test route command generation
#[tokio::test]
async fn test_login_command_generation() {
    let use_case = AuthUseCase::new();
    let request = LoginRequest { /* ... */ };
    
    let command = use_case.handle_login(request).await.unwrap();
    
    // Verify command structure
    assert!(matches!(command, RouteCommand::Sequence { .. }));
    
    // Verify command content
    if let RouteCommand::Sequence { commands } = command {
        assert_eq!(commands.len(), 2);
        assert!(matches!(commands[0], RouteCommand::ProcessData { .. }));
        assert!(matches!(commands[1], RouteCommand::NavigateTo { .. }));
    }
}

// ✅ Test version compatibility
#[test]
fn test_version_fallback_generation() {
    let command = generate_versioned_command(client_version_100);
    assert!(command.fallback.is_some()); // Ensure fallback exists
}
```

```javascript
// ✅ Frontend testing best practices
describe('RouterHandler Integration', () => {
    test('handles complete user flow', async () => {
        // Test realistic user scenarios
        const loginCommand = {
            type: 'Sequence',
            payload: {
                commands: [
                    { type: 'ProcessData', payload: { data_type: 'user', data: mockUser } },
                    { type: 'NavigateTo', payload: { path: '/dashboard' } }
                ]
            }
        }
        
        await routerHandler.execute(loginCommand)
        
        // Verify state changes and navigation
        expect(mockStore.setUser).toHaveBeenCalledWith(mockUser)
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
})
```

#### Observability Best Practices
```rust
// ✅ Use structured logging with correlation IDs
#[instrument(skip_all, fields(correlation_id = %correlation_id))]
pub async fn handle_user_action(
    correlation_id: String,
    request: ActionRequest
) -> UseCaseResult<RouteCommand> {
    info!(correlation_id = %correlation_id, "Processing user action");
    
    // Implementation with detailed logging
}
```

```javascript
// ✅ Report metrics in production
if (process.env.NODE_ENV === 'production') {
    routerHandler.reportExecutionMetrics({
        executionId,
        commandType: routeCommand.type,
        duration,
        success: true,
        timestamp: new Date().toISOString()
    })
}
```