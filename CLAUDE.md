# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

✅ **Backend-Driven Routing System** - Complete implementation and optimization  
✅ **Frontend-Backend Integration** - CORS support, complete API communication  
✅ **User Authentication Flow** - Session-based login system  
✅ **Code Cleanup** - Debug code removal, standardized configuration  
✅ **Production Ready** - Ready for formal business development  
✅ **Architecture Enhancement v2.0** - Version control, fallback mechanisms, observability (August 2024)
✅ **Multi-Frontend Architecture Refactoring** - Separation of C-end and B-end apps, Taro dependency removal (August 2025)

## Development Commands

### Backend (Rocket Server)
```bash
cd rocket-taro-server

# Development mode with structured logging
cargo run

# Production build and run
cargo build --release
cargo run --release

# Check code quality
cargo check
cargo clippy

# Environment variables (configured in Rocket.toml)
# Database: host=192.168.5.222 port=5432 user=user_ck dbname=postgres
# Redis: redis://:ck320621@192.168.5.222:6379
# Optional: Copy .env.example to .env to override defaults
```

### Frontend Applications

#### Mobile H5 Application (Vue3 + Vant)
```bash
cd frontend-new/mobile/h5

# Install dependencies
npm install

# Set as active development platform (required)
npm run platform:use

# Development mode
npm run dev           # Development server (http://localhost:3000)

# Production build
npm run build         # Outputs to ../../rocket-taro-server/frontend-new/mobile/h5
```

#### Admin Panel (Vue3 + Element Plus + TypeScript)
```bash
cd frontend-new/admin

# Install dependencies  
npm install

# Set as active development platform (required)
npm run platform:use

# Development mode
npm run dev           # Development server (http://localhost:3001)

# Production build
npm run build         # Outputs to ../../rocket-taro-server/frontend-new/admin
```

#### WeChat Mini Program (Native + Skyline)
```bash
cd frontend-new/mobile/mini-program

# Set as active development platform (required)
node ../../scripts/enforce-single-platform.js switch miniprogram

# Development with WeChat DevTools
# Import project directory in WeChat Developer Tools
```

### Database Setup
The application uses PostgreSQL with auto-initialization. Database tables and default users are created automatically on first startup.

Default test accounts:
- Username: `admin`, Password: `password` (admin role)
- Username: `test`, Password: `password` (regular user)

## Architecture Overview

### Project Structure
Multi-frontend Rocket application supporting mobile H5, WeChat mini-program, and admin panel.

```
rocket-taro-server/          # Backend application
├── src/
│   ├── auth/               # Authentication guards and middleware
│   ├── database/           # Database connection and operations
│   ├── models/             # Data models and structs
│   ├── routes/             # API route handlers
│   ├── use_cases/          # Business logic layer
│   ├── cache/              # Redis caching layer
│   └── fairings/           # Rocket fairings (CORS, etc.)
├── frontend-new/           # Built frontend assets served statically
└── Cargo.toml              # Rust dependencies

frontend-new/                # Multi-platform frontend applications
├── mobile/
│   ├── h5/                 # Vue3 + Vant H5 application
│   └── mini-program/       # Native WeChat mini-program
├── admin/                  # Vue3 + Element Plus admin panel
└── shared/                 # Shared utilities and components
```

### Authentication System
Session-based authentication system:
- **Models**: User, UserSession, LoginRequest/Response in `src/models/auth.rs`
- **Database**: PostgreSQL with auto-initialized tables
- **Guards**: Request guards in `src/auth/guards.rs` for route protection
- **API**: Authentication endpoints in `src/routes/auth.rs`
- **Sessions**: 7-day expiration with automatic cleanup

### Backend-Driven Routing Architecture

#### Core Concept
Backend controls frontend navigation, dialog display, and state management through structured route commands. This centralizes business logic and ensures consistent user experience across platforms.

#### Key Components
1. **Route Command Model** (`src/models/route_command.rs`)
2. **Use Case Layer** (`src/use_cases/`) - Business logic with RouteCommand generation
3. **Frontend RouterHandler** (`frontend-new/shared/router/RouterHandlerCore.js`)
4. **Platform Adapters** - Platform-specific navigation implementation
5. **Unified API Response Format**:
   ```json
   {
     "code": 200,
     "message": "success", 
     "data": { "response_data": "..." },
     "route_command": { "type": "NavigateTo", "payload": {...} }
   }
   ```

#### Architecture Benefits
- **Centralized Business Logic**: All user flows managed on backend
- **Multi-Platform Consistency**: Same logic across H5, WeChat, Admin
- **Dynamic Flow Control**: Backend adjusts user experience in real-time
- **Reduced Frontend Complexity**: Frontend focuses on UI rendering
- **Easy Testing**: Business logic testing concentrated on backend

### Route Configuration System

#### Overview
The project uses a centralized route configuration system to prevent frontend-backend route inconsistencies and eliminate hardcoded routes in the codebase.

#### Key Components
1. **Route Configuration File** (`routes.toml`):
   ```toml
   [routes.auth]
   login = { miniprogram = "/pages/login/login", h5 = "/login", admin = "/auth/login" }
   register = { miniprogram = "/pages/auth/register", h5 = "/register", admin = "/auth/register" }
   
   [routes.home]
   main = { miniprogram = "/pages/home/home", h5 = "/", admin = "/dashboard" }
   
   [defaults]
   platform = "miniprogram"
   ```

2. **Route Configuration Manager** (`src/config/route_config.rs`):
   - Platform detection from User-Agent headers
   - Route lookup by key and platform
   - Configuration validation on startup
   - Fallback mechanisms for missing routes

3. **Integration Points**:
   - **Use Cases**: `RouteCommandGenerator` uses route configuration
   - **API Routes**: Platform detection and route injection
   - **Frontend**: Platform adapters consume backend route commands

#### Benefits
- **No Hardcoded Routes**: All routes defined in central configuration
- **Platform Consistency**: Same route key maps to different platform-specific paths
- **Hot Configuration**: Routes can be updated without code changes
- **Validation**: Startup validation ensures all required routes are configured
- **Fallback Safety**: Default routes prevent runtime failures

## Development Standards

### Single-Platform Development Constraint
**MANDATORY**: Use single-platform development constraint mechanism to prevent simultaneous development across platforms.

```bash
# Platform management commands
node scripts/enforce-single-platform.js status
node scripts/enforce-single-platform.js switch h5|miniprogram|admin
node scripts/enforce-single-platform.js unlock
```

### C-End Development Workflow (MANDATORY)
**Required** for all user-facing functionality:
- Login, Registration, User Profile pages
- Product browsing, Shopping cart, Order flow  
- Payment processing, Account management

**Implementation Requirements**:
- All API responses MUST include `route_command` field when navigation/UI changes are needed
- Frontend MUST use `RouterHandler.execute()` for all route commands
- NO direct frontend routing (`router.push`, `Taro.navigateTo`) in user-facing pages
- Business logic centralized in backend use cases

**Development Order**: Backend Use Cases → API Routes → Frontend Pages

### B-End Development (FLEXIBLE)
Admin/management tools can use traditional frontend routing for rapid development.

### Environment Configuration
Use environment variables for configuration:
- Copy `.env.example` to `.env` and configure as needed
- Backend: `DATABASE_URL`, `REDIS_URL`, `ROCKET_SECRET_KEY`
- Frontend: `VITE_API_URL`, `VITE_PRODUCTION_API_URL`

### Code Style Requirements

#### Code Formatting Standards
- **Indentation**: Use 2 spaces for code indentation consistently
- **Comments**: Comments and logs should not exceed 100 characters, add necessary comments only
- **TypeScript**: Semicolons are mandatory at the end of TS code statements
- **Type Safety**: Cannot use `any`, avoid using `unknown` whenever possible
- **DO NOT ADD COMMENTS** unless explicitly requested

#### Architecture Design Principles
- **High Cohesion, Low Coupling**: Follow the principle of "high cohesion, low coupling"
- **Best Practices**: Comply with industry best practices
- **Function Limitation**: Each function should not exceed 100 lines, ensure clear responsibilities
- **Code Quality**: Code should be concise and elegant

#### Technical Specifications
- **Vue Component Structure**: script first, template middle, style last
- **Logging System**: Use project logger instead of console.log, note that logger only accepts one parameter
- **Type Safety**: TS code must comply with type safety requirements
- **Internationalization**: Do not use hardcoded text, use i18n solution, support Chinese first

#### Platform Adaptation
- **Mobile Projects**: Consider large/small screen adaptation and iOS/Android compatibility, prioritize iOS experience
- **Desktop Projects**: Consider large/small screen adaptation and Mac/Windows compatibility, prioritize Windows experience

#### General Requirements
- Follow existing code patterns and conventions
- Use existing libraries and utilities already in the codebase
- Never introduce code that exposes secrets or keys

## API Development

### Standard Response Format
All user-facing API endpoints MUST follow this format:
```rust
ApiResponse {
    code: 200,
    message: "success".to_string(),
    data: Some(response_data),
    route_command: Some(route_command), // REQUIRED for navigation/UI changes
}
```

### Frontend Integration Pattern
```javascript
const handleUserAction = async (actionData) => {
    try {
        const response = await apiClient.performAction(actionData)
        // Execute any route commands from backend
        if (response.route_command) {
            await routerHandler.execute(response.route_command)
        }
        // Handle response data if needed
        if (response.data) {
            updateLocalState(response.data)
        }
    } catch (error) {
        console.error('Action failed:', error)
    }
}
```

## Database Modifications (CRITICAL)

### Database Modification Protocol
**MANDATORY**: When any database schema changes are needed, follow this strict protocol:

1. **SQL Script Creation**:
   - Write all SQL statements in `rocket-taro-server/src/database/migrations/`
   - Include clear comments explaining each change
   - Provide rollback SQL for each modification

2. **Execution Order**:
   - Clearly document SQL execution order with numbered steps
   - Include any dependencies between statements
   - Specify if any data migration is needed

3. **Verification SQL**:
   - Provide SELECT statements to verify changes
   - Include expected results for verification
   - Example:
   ```sql
   -- Verification for is_guest column
   SELECT column_name, data_type, is_nullable, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'is_guest';
   ```

4. **User Confirmation Required**:
   - **STOP and ASK**: "Please execute the following SQL in your database..."
   - **WAIT for confirmation**: "Have you completed the database modifications?"
   - **ONLY proceed after explicit confirmation**

5. **Database Connection Info**:
   - Host: 192.168.5.222
   - Port: 5432
   - User: user_ck
   - Database: postgres

### Example Database Modification Flow
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Verify column added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_guest';

-- Expected result: 
-- column_name | data_type | column_default
-- is_guest    | boolean   | false
```

## Testing & Quality Assurance

### Backend Testing
```bash
cd rocket-taro-server
cargo test
cargo clippy
```

### Frontend Testing
```bash
cd frontend-new/mobile/h5  # or admin
npm run lint
npm run type-check
npm run build
```

### Mandatory Pre-commit Checks
- Backend: `cargo check && cargo clippy`
- Frontend: `npm run lint && npm run type-check`
- Route commands testing for C-end features
- **CRITICAL: Route Consistency Validation** (see below)

### Route Consistency Validation (MANDATORY)
**MUST be performed after any development work involving navigation or routing**

#### When to Validate
- After implementing new user-facing features
- After modifying existing route-related code
- Before committing any frontend or backend changes
- After updating `routes.toml` configuration

#### Validation Steps
1. **Backend Validation**:
   ```bash
   cd rocket-taro-server
   cargo test route_config  # Verify route configuration tests pass
   cargo run                # Ensure server starts without route validation errors
   ```

2. **Configuration Completeness Check**:
   ```bash
   # Verify all required routes are configured in routes.toml
   # Check that every platform (miniprogram, h5, admin) has valid paths
   # Ensure no empty route paths exist
   ```

3. **Frontend-Backend Consistency Check**:
   - Verify frontend page paths match configured routes
   - Test actual navigation flows for each platform
   - Check that backend route commands resolve to existing frontend pages
   - Validate User-Agent detection works correctly

4. **Platform-Specific Testing**:
   - **Mini-program**: Test TabBar navigation and regular page navigation
   - **H5**: Verify Vue Router paths match configured routes  
   - **Admin**: Ensure admin panel routes are accessible

#### Route Configuration Rules
- All routes must start with `/` (validated on startup)
- Mini-program routes should use `/pages/` prefix
- No duplicate routes within same platform
- Default fallback routes must always be configured
- Every business flow must have corresponding route entries

#### Emergency Fallbacks
If route configuration fails during development:
- Default routes are used as fallbacks
- Check server logs for route resolution warnings
- Verify `routes.toml` syntax and structure
- Test with different User-Agent headers

**Failure to validate routes is a critical development error that can cause navigation failures in production.**

## 微信小程序开发常见问题汇总 (CRITICAL)

### 导航超时问题 (Navigation Timeout)

#### 问题现象
```
Navigation failed: {errMsg: "navigateTo:fail timeout"}
```

#### 根本原因
1. **TabBar页面导航方式错误**：TabBar页面之间不能使用`wx.redirectTo`
2. **直接调用wx API违反架构**：应使用后端驱动路由而非直接调用微信API
3. **页面认证检查逻辑不当**：在页面加载时进行阻塞式认证检查

#### 解决方案
1. **使用正确的导航API**：
   ```javascript
   // ❌ 错误：TabBar页面使用redirectTo
   wx.redirectTo({ url: '/pages/login/login' })
   
   // ✅ 正确：非TabBar页面导航
   wx.navigateTo({ url: '/pages/login/login' })
   
   // ✅ 正确：TabBar页面间导航  
   wx.switchTab({ url: '/pages/home/home' })
   ```

2. **使用后端驱动路由**：
   ```javascript
   // ❌ 错误：直接调用微信API
   wx.redirectTo({ url: '/pages/login/login' })
   
   // ✅ 正确：使用后端驱动路由
   await app.handleProtectedPageAccess('/pages/profile/profile')
   ```

3. **非阻塞式认证检查**：
   ```javascript
   // ❌ 错误：阻塞式检查导致超时
   if (!isLoggedIn) {
     wx.redirectTo({ url: '/pages/login/login' })  // 可能超时
     return
   }
   
   // ✅ 正确：异步非阻塞处理
   if (!isLoggedIn) {
     try {
       await app.handleProtectedPageAccess(getCurrentPath())
     } catch (error) {
       // 降级处理
       wx.navigateTo({ url: '/pages/login/login' })
     }
     return
   }
   ```

### 网络连接拒绝问题 (ERR_CONNECTION_REFUSED)

#### 问题现象
```
POST http://localhost:8000/api/auth/guest-login net::ERR_CONNECTION_REFUSED
```

#### 根本原因
- 后端服务器未启动或端口不匹配

#### 解决方案
1. **确认后端服务状态**：
   ```bash
   cd rocket-taro-server && cargo run
   ```
2. **验证服务可用性**：
   ```bash
   curl http://localhost:8000/api/health
   ```
3. **检查开发者工具设置**：确保"不校验合法域名"已开启

### API路由404问题

#### 问题现象
```
ERROR No matching routes for GET /api/user/info
```

#### 根本原因
- 前端调用了未实现的API端点

#### 解决方案
1. **前后端API契约验证**：确保前端调用的API端点在后端已实现
2. **定期检查404错误日志**：及时发现和修复缺失的API
3. **API文档同步**：保持前后端API文档一致

### 页面认证架构最佳实践

#### 标准认证检查模式
```javascript
async loadUserInfo() {
  const userInfo = app.getUserInfo()
  const isLoggedIn = app.isLoggedIn()
  const isSessionValid = app.isSessionValid()
  
  if (!isLoggedIn || !isSessionValid) {
    if (isLoggedIn && !isSessionValid) {
      app.clearUserSession()
      wx.showToast({
        title: '登录已过期',
        icon: 'none'
      })
    }
    
    try {
      // 使用后端驱动路由
      await app.handleProtectedPageAccess(getCurrentPagePath())
    } catch (error) {
      console.error('Protected page access failed:', error)
      // 降级处理：直接导航
      wx.navigateTo({ url: '/pages/login/login' })
    }
    return
  }

  // 认证通过，正常加载页面数据
  this.setData({
    userInfo: userInfo,
    isLoggedIn: isLoggedIn
  })
}
```

#### 关键要点
1. **异步处理**：认证检查必须是async函数
2. **错误降级**：后端路由失败时提供降级方案
3. **会话清理**：过期会话及时清理
4. **用户反馈**：提供适当的用户提示

## Common Issues & Solutions

### Database Connection
Database connection string configuration:
- Development: Uses `Rocket.toml` or `DATABASE_URL` environment variable
- Production: Set `DATABASE_URL` environment variable

### Frontend Development
- ALWAYS set active platform before development: `npm run platform:use`
- Use injected `apiClient` for all API calls
- Never use direct navigation in C-end pages
- Follow script → template → style component structure (technical debt: not fully implemented)

### Multi-Platform Support
The system supports multiple frontend platforms:
- Mobile H5: Modern web app with Vue3 + Vant
- WeChat Mini Program: Native implementation with Skyline rendering  
- Admin Panel: Desktop web app with Vue3 + Element Plus

## Documentation

### Required Documentation (Bilingual)
- All major features require both Chinese and English documentation
- Location: `docs/zh-CN/` and `docs/en/`
- C-end development workflow: See `docs/*/c-end-routing-development-workflow.md`

### Development Workflow Reference
For C-end development, strictly follow the workflow documented in:
- Chinese: `docs/zh-CN/c-end-routing-development-workflow.md`
- English: `docs/en/c-end-routing-development-workflow.md`

## Important Notes

- **Single Platform Focus**: Never develop multiple frontend platforms simultaneously
- **Backend-First C-End**: All user-facing features must be developed backend-first
- **Route Commands**: C-end navigation MUST use backend-driven route commands
- **Environment Variables**: Use `.env` files for configuration, never hardcode
- **Security**: Never commit secrets, keys, or sensitive configuration

## Critical Development Rules (Based on Production Issues)

### API Integration Contract Rules
- **MANDATORY Route Consistency**: Frontend API calls MUST exactly match backend route definitions
  - Backend routes use kebab-case: `/user-data`, `/auth-status`
  - Frontend API calls must match: `apiClient.get('/user-data')` not `apiClient.get('/user/data')`
  - **Rule**: Always verify route names in backend `src/routes/` files before implementing frontend calls

### State Management Type Safety Rules
- **MANDATORY Method Verification**: Always verify store method/property existence before calling
  - Check computed properties vs methods: `userStore.isLoggedIn` (computed) vs `userStore.clearUser()` (method)
  - **Rule**: Examine store file structure before implementing state access patterns
  - **Pattern**: Use `userStore.isLoggedIn` not `userStore.isAuthenticated()`

### Parameter Safety Rules
- **MANDATORY Null Safety**: Always provide default values for optional parameters
  - Navigation params: `{ params: params || {}, query: query || {} }`
  - API parameters: `apiClient.get(url, params || {})`
  - **Rule**: Never pass undefined/null to methods expecting objects

### Error Handling Consistency Rules
- **MANDATORY Status Code Handling**: Always handle authentication state in API error responses
  - Check for 401 errors in logout flows: `error.message.includes('401')`
  - Clear local state on authentication errors: `userStore.clearUser()`
  - **Rule**: Implement graceful degradation for authentication failures

### Common Error Patterns to Avoid
1. **Route Mismatch**: Frontend `/user/data` ≠ Backend `/user-data` → Always cross-reference routes
2. **Method Missing**: `userStore.isAuthenticated()` doesn't exist → Check store computed properties
3. **Null Reference**: `Object.keys(undefined)` → Provide default empty objects
4. **State Inconsistency**: Multiple logout calls cause 401 → Check authentication state first

## Git Workflow

### Committing Changes
When creating commits, follow the established patterns:
1. Run parallel git status, diff, and log commands to understand changes
2. Analyze all changes and draft appropriate commit message
3. Add relevant files and create commit with standardized message ending:
   ```
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

### Pull Requests
Use `gh pr create` with proper summary and test plan when requested.

---

This project implements a sophisticated backend-driven routing system that enables consistent user experiences across multiple frontend platforms while maintaining clean separation of concerns and testable business logic.