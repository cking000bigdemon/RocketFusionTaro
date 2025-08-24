# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目状态

✅ **后端驱动路由系统** - 完整实现并已清理优化  
✅ **前后端集成** - CORS支持，完整的API通信  
✅ **用户认证流程** - Session-based登录系统  
✅ **代码清理** - 移除调试代码，标准化配置  
✅ **生产就绪** - 可开始正式业务开发  
✅ **架构增强 v2.0** - 版本控制、fallback机制、可观测性 (2024年8月完成)

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

### Frontend (Taro Application)
```bash
cd frontend

# Install dependencies
npm install

# Development modes
npm run dev:h5        # H5 web development
npm run dev:weapp     # WeChat mini-program development

# Production builds  
npm run build:h5      # Web build
npm run build:weapp   # WeChat mini-program build
```

### Database Setup
The application uses PostgreSQL with auto-initialization. Database tables and default users are created automatically on first startup. SQL initialization files are located in `database/`.

Default test accounts:
- Username: `admin`, Password: `password` (admin role)
- Username: `test`, Password: `password` (regular user)

## Architecture Overview

### Project Structure
This is a Rocket + Taro full-stack application template that supports web, H5, and WeChat mini-program deployment.

```
rocket-taro-server/     # Main backend application
├── src/
│   ├── auth/          # Authentication guards and middleware
│   ├── database/      # Database connection and operations
│   ├── models/        # Data models and structs
│   ├── routes/        # API route handlers
│   └── fairings/      # Rocket fairings (CORS, etc.)
├── frontend/dist/     # Built frontend assets served statically
└── Cargo.toml         # Rust dependencies

frontend/              # Taro React frontend
├── src/               # React components and pages
├── config/            # Taro build configuration
└── package.json       # Node.js dependencies
```

### Authentication System
The application implements a session-based authentication system:

- **Models**: User, UserSession, LoginRequest/Response in `src/models/auth.rs`
- **Database**: PostgreSQL with user, user_sessions, login_logs tables
- **Guards**: Request guards in `src/auth/guards.rs` for route protection
- **API**: Authentication endpoints in `src/routes/auth.rs`

Key authentication flows:
1. Login creates a session token stored in database and HTTP-only cookie
2. Request guards validate session tokens on protected routes
3. Sessions have 7-day expiration with automatic cleanup

### Database Layer
- **Connection**: Single PostgreSQL connection with Arc<Mutex<Client>> pooling
- **Auto-init**: Tables and default users created automatically on startup
- **Operations**: Database functions in `src/database/auth.rs` and `src/database/mod.rs`

### API Structure
The server mounts routes in two groups:
- `/api/*` - API endpoints (health, user data)  
- `/*` - Authentication, user data, and static file serving

### Frontend Integration
- Frontend builds to `frontend/dist/` and is served by Rocket FileServer
- Supports multi-platform builds (Web, H5, WeChat mini-program)
- Authentication state managed via API calls to backend

## Important Notes

### Database Connection
Database connection string is currently hardcoded in `src/database/mod.rs`. For production, this should be moved to environment variables or configuration files.

### Windows Development
Use MSVC toolchain to avoid dlltool.exe issues:
```bash
rustup default stable-x86_64-pc-windows-msvc
```

### Build Scripts
Automated build scripts are available in `scripts/` directory:
- `build-all.bat` - Full project build
- `build-frontend.bat` - Frontend only
- `start-rocket.bat` - Start server

### Multi-Platform Frontend
The Taro frontend can target multiple platforms. Use appropriate npm commands based on target platform. Built assets are automatically served by the Rocket backend.

## Backend-Driven Routing Architecture

### Core Concept
This project implements a **Backend-Driven Routing System** where the backend controls frontend navigation, dialog display, and state management through structured route commands. This architecture centralizes business logic and ensures consistent user experience across all platforms.

### Architecture Components

#### 1. Route Command Model (`src/models/route_command.rs`)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum RouteCommand {
    NavigateTo { path: String, params: Option<Value>, replace: Option<bool> },
    ShowDialog { dialog_type: DialogType, title: String, content: String, actions: Vec<DialogAction> },
    ProcessData { data_type: String, data: Value, merge: Option<bool> },
    Sequence { commands: Vec<RouteCommand> },
    // ... other command types
}
```

#### 2. Use Case Layer (`src/use_cases/auth_use_case.rs`)
Business logic centralization layer that generates appropriate route commands based on user state and business rules.

#### 3. Frontend Router Handler (`frontend/src/utils/routerHandler.js`)
```javascript
class RouterHandler {
    async execute(routeCommand) {
        switch (routeCommand.type) {
            case 'NavigateTo': return this.handleNavigateTo(routeCommand.payload)
            case 'ShowDialog': return this.handleShowDialog(routeCommand.payload)
            case 'ProcessData': return this.handleProcessData(routeCommand.payload)
            // ... other handlers
        }
    }
}
```

#### 4. Unified API Response Format
```javascript
{
    "code": 200,
    "message": "success", 
    "data": { /* response data */ },
    "route_command": { /* optional route command */ }
}
```

### Implementation Benefits
- **Centralized Business Logic**: All user experience flows managed on backend
- **Multi-Platform Consistency**: Same business logic across H5, WeChat Mini Program, etc.
- **Dynamic Flow Control**: Backend can adjust user experience in real-time
- **Reduced Frontend Complexity**: Frontend focuses on UI rendering and command execution
- **Easy Testing**: Business logic testing concentrated on backend

### Architecture Enhancements v2.0 (August 2024)

#### 1. Version Control & Compatibility
- **Versioned Route Commands**: Commands now support version field for backward compatibility
- **Automatic Fallback**: Server provides fallback commands for unsupported client versions
- **Compatibility Checking**: Client validates command version before execution

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionedRouteCommand {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(flatten)]
    pub command: RouteCommand,
    pub fallback: Option<Box<VersionedRouteCommand>>,
    pub metadata: RouteCommandMetadata,
}
```

#### 2. Enhanced Command Types
New command types for complex business flows:
- **Delay**: Execute commands with timing control
- **Parallel**: Execute multiple commands simultaneously  
- **Retry**: Automatic retry with exponential backoff
- **Conditional**: Execute commands based on runtime conditions

#### 3. Business Logic Separation
- **RouteCommandGenerator**: Dedicated class for routing decision logic
- **Pure Use Cases**: Business logic methods return business results, not route commands
- **Clean Architecture**: Clear separation between business logic and UI routing

#### 4. Global Request Interceptor
- **Automatic Route Processing**: All API responses automatically processed for route commands
- **Zero Frontend Code**: No manual route command handling needed in components
- **Background Execution**: Commands execute asynchronously without blocking UI

#### 5. Enhanced Observability
- **Structured Logging**: Comprehensive tracing with execution IDs
- **Performance Monitoring**: Duration tracking for all command executions
- **Error Reporting**: Automatic error metrics collection
- **Execution History**: Detailed audit trail for debugging
- **Metrics Endpoints**: Real-time system health and performance data

```javascript
// Frontend execution metrics automatically collected
const stats = routerHandler.getExecutionStats()
// Returns: success rate, avg duration, command type distribution, etc.
```

#### 6. Fallback & Error Recovery
- **Multi-Level Fallbacks**: Command-level, execution-level, and system-level fallbacks
- **Graceful Degradation**: System continues operating even when advanced features fail
- **Error Boundaries**: Isolated error handling prevents system-wide failures

### Testing Verification Status
✅ **End-to-End Testing Completed** (August 2025):
- Admin user login → Navigate to `/admin-dashboard`
- Regular user login → Navigate to `/home`  
- Login failure → Display error dialog
- User logout → Clear data and redirect to login
- Frontend-backend communication verified
- API proxy functionality confirmed
- Static file serving working correctly

### Frontend Dependency Issues Resolution
**Problem**: Node.js v22.18.0 compatibility issues with Taro 3.6.23 and SWC compiler
**Solution**: 
1. Clear `node_modules` and `package-lock.json`
2. Install missing dependency: `npm install --save-dev @pmmmwh/react-refresh-webpack-plugin`
3. Use `npm install --legacy-peer-deps` for version conflicts
4. Replace deprecated Babel plugins

### Multi-Platform Frontend
The Taro frontend can target multiple platforms. Use appropriate npm commands based on target platform. Built assets are automatically served by the Rocket backend.

## Development Standards

### Page Development Architecture Standards

#### User-Facing Pages (C-端页面) - MANDATORY Backend-Driven Routing
**REQUIRED** for all user-facing functionality:
- Login, Registration, User Profile pages
- Product browsing, Shopping cart, Order flow  
- Payment processing, Account management
- Any feature requiring consistent user experience across platforms

**Implementation Requirements**:
- All API responses MUST include `route_command` field when navigation/UI changes are needed
- Frontend MUST use `RouterHandler.execute()` for all route commands
- NO direct frontend routing (`Taro.navigateTo`, `Taro.redirectTo`) in user-facing pages
- Business logic centralized in backend use cases

**Example Implementation**:
```javascript
// ❌ FORBIDDEN in user-facing pages
if (loginSuccess) {
    Taro.navigateTo({ url: '/pages/home/index' })
}

// ✅ REQUIRED approach
const response = await api.login(credentials)
routerHandler.execute(response.route_command)
```

#### Admin/Management Pages (B-端页面) - FLEXIBLE Routing Options
**OPTIONAL** backend-driven routing for internal management tools:
- Admin dashboards, Data configuration panels
- Complex data tables and CRUD operations  
- Developer tools and system maintenance
- Features prioritizing development efficiency over unified UX

**Implementation Flexibility**:
- Can use traditional frontend routing for rapid development
- Can adopt backend-driven routing for complex business flows
- Mixed approach allowed within admin sections

**Decision Matrix**:
- Simple CRUD operations → Traditional frontend routing acceptable
- Complex workflow with business rules → Consider backend-driven routing
- Multi-step processes → Recommended backend-driven routing

#### Architecture Coexistence
- Both routing mechanisms can coexist in the same project
- User-facing routes (`/pages/login/`, `/pages/home/`, etc.) use backend-driven routing
- Admin routes (`/pages/admin/`, `/pages/manage/`, etc.) can choose optimal approach
- Shared components and utilities support both patterns

### Backend-Driven Routing Implementation Guide

#### Creating New Route Commands
1. **Define Command in Rust** (`src/models/route_command.rs`):
```rust
// Add new command variant to RouteCommand enum
CustomAction {
    action_type: String,
    parameters: serde_json::Value,
}
```

2. **Implement Business Logic** (`src/use_cases/`):
```rust
// Generate command based on business rules
fn handle_custom_flow(&self, context: &Context) -> RouteCommand {
    RouteCommand::CustomAction {
        action_type: "payment_flow".to_string(),
        parameters: json!({ "amount": context.amount }),
    }
}
```

3. **Handle in Frontend** (`frontend/src/utils/routerHandler.js`):
```javascript
// Add handler method
async handleCustomAction(payload) {
    // Implement frontend action
    await this.processCustomLogic(payload.parameters)
}
```

#### Observability & Monitoring Integration
**New Metrics Endpoints** (August 2024):
```rust
// Backend metrics collection endpoints
POST /api/metrics/route-command-error  // Frontend error reporting
POST /api/metrics/performance          // Performance metrics  
POST /api/metrics/health               // System health status
```

**Frontend Integration**:
```javascript
// Automatic error reporting (production only)
if (process.env.NODE_ENV === 'production' && status === 'error') {
    this.reportExecutionMetrics(record)
}

// Performance metrics collection
const stats = routerHandler.getExecutionStats()
console.log(`Success rate: ${stats.successRate}, Avg duration: ${stats.avgDuration}ms`)
```

#### API Response Standards
**All user-facing API endpoints MUST follow this format**:
```rust
ApiResponse {
    code: 200,
    message: "success".to_string(),
    data: Some(response_data),
    route_command: Some(route_command), // REQUIRED for navigation/UI changes
}
```

#### Frontend Integration Pattern
```javascript
// In page components - STANDARD PATTERN
const handleUserAction = async (actionData) => {
    try {
        const response = await api.performAction(actionData)
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

### Version Documentation Management
- **Mandatory Requirement**: Every new feature development must include separate version documentation
- **Bilingual Requirement**: All important documents must provide both Chinese and English versions
- **Directory Structure**: Use docs/en/ and docs/zh-CN/ for language separation
- **Document Location**: 
  - English version: docs/en/releases/vX.X.X.md
  - Chinese version: docs/zh-CN/releases/vX.X.X.md
- **Template Usage**: 
  - English template: docs/en/releases/template.md
  - Chinese template: docs/zh-CN/releases/template.md

### Documentation Internationalization Standards
- **Directory Structure**: 
  - English documents unified under `docs/en/` directory
  - Chinese documents unified under `docs/zh-CN/` directory
  - Both language subdirectory structures must be completely identical
- **Content Requirements**: 
  - Chinese and English versions must remain synchronized
  - Use unified Chinese-English terminology mapping
  - Code examples and configurations must be consistent
  - File names must be identical in both language directories
- **Maintenance Responsibility**: 
  - Every document update must simultaneously update both Chinese and English versions
  - New documents must be created in both languages simultaneously
  - Document deletion must remove both language versions simultaneously

### Documentation Update Workflow
1. Before developing new features, create version document drafts in docs/en/releases/ and docs/zh-CN/releases/
2. During development, continuously update relevant documents in both language directories
3. After feature completion, update related API documentation, user guides, etc. in both Chinese and English versions
4. Before release, check consistency of docs/en/ and docs/zh-CN/ directory structures
5. Ensure corresponding file content is synchronized and accurate

### Documentation Navigation
- Provide navigation links to the other language in each language's root directory
- Provide document language selection guidance in README.md

## Frontend Design Standards

### UI/UX Design Guidelines

#### 设计风格 (Design Style)
- **风格定位**: 简约、高效、重点突出 (Minimalist, Efficient, Focus-oriented)
- **设计原则**: 内容至上，减少视觉干扰，提升用户操作效率
- **交互理念**: 直观易懂，减少用户学习成本

#### 色彩规范 (Color Scheme)
**主色调**: 浅蓝色与白色为主的清新色系
- **主色 (Primary)**: `#4A90E2` - 清新蓝色，用于主要操作按钮和重要信息
- **辅助色 (Secondary)**: `#F8FAFE` - 极淡蓝色，用于背景区域和卡片容器
- **背景色 (Background)**: `#FFFFFF` - 纯白色，主要内容区域背景
- **文字色 (Text)**: 
  - 主要文字: `#333333` - 深灰色
  - 次要文字: `#666666` - 中灰色  
  - 辅助文字: `#999999` - 浅灰色
- **成功色 (Success)**: `#52C41A` - 绿色，成功状态提示
- **警告色 (Warning)**: `#FAAD14` - 橙色，警告状态提示
- **错误色 (Error)**: `#F5222D` - 红色，错误状态提示

#### 组件规范 (Component Standards)

##### UI组件库选择
- **组件库**: 使用 `@taroify/core` 中的前端UI组件
- **使用原则**: 仅使用组件的UI展示能力，不使用其API交互能力
- **定制化**: 通过CSS覆盖实现符合设计规范的视觉效果

##### 常用组件规范
1. **Button 按钮组件**:
   - 主按钮: 使用主色 `#4A90E2`，圆角 `6px`
   - 次按钮: 边框样式，使用主色边框
   - 按钮高度: 默认 `44px`，小尺寸 `32px`

2. **Input 输入框组件**:
   - 边框色: 默认 `#D9D9D9`，聚焦 `#4A90E2`
   - 圆角: `6px`
   - 内边距: `12px 16px`
   - 字体大小: `16px`

3. **Cell 单元格组件**:
   - 背景: `#FFFFFF`
   - 分割线: `#F0F0F0`
   - 内边距: `16px`

4. **Dialog 对话框组件**:
   - 背景: `#FFFFFF`
   - 圆角: `12px`
   - 阴影: `0 8px 24px rgba(0, 0, 0, 0.12)`

#### 页面布局规范 (Layout Standards)

##### 间距系统 (Spacing System)
- **基础单位**: 4px
- **常用间距**: 8px, 12px, 16px, 20px, 24px, 32px
- **页面边距**: 16px (移动端), 24px (桌面端)
- **组件间距**: 16px (同类组件), 24px (不同功能区域)

##### 栅格系统 (Grid System)
- **页面最大宽度**: 无限制，但内容区域建议最大 `1200px`
- **响应断点**: 
  - 移动端: `< 768px`
  - 平板: `768px - 1024px`  
  - 桌面端: `> 1024px`

#### 交互规范 (Interaction Standards)

##### 反馈机制
- **加载状态**: 使用统一的Loading组件，避免页面空白
- **操作反馈**: 重要操作必须提供Toast或Dialog反馈
- **错误处理**: 友好的错误提示，避免技术术语

##### 动效规范
- **过渡时间**: 300ms (页面切换), 150ms (状态变化)
- **缓动函数**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material Design标准)

#### 移动端适配 (Mobile Optimization)

##### 微信小程序适配
- **安全区域**: 适配各种设备的安全区域
- **导航栏**: 遵循微信小程序设计规范
- **底部安全区**: iPhone X系列底部适配

##### 触控优化
- **点击热区**: 最小 `44px x 44px`
- **手势支持**: 支持常见的滑动手势
- **键盘适配**: 输入框聚焦时的键盘遮挡处理

#### 实施要求 (Implementation Requirements)

1. **强制要求**: 所有新开发的用户界面必须严格遵循本设计标准
2. **组件复用**: 优先使用 Taroify 标准组件，必要时进行样式定制
3. **一致性检查**: 定期检查界面一致性，确保视觉统一
4. **响应式设计**: 确保在不同设备和屏幕尺寸下的良好体验

#### CSS 命名规范 (CSS Naming Convention)

使用 BEM (Block Element Modifier) 命名方法：
```css
/* 页面级别 */
.page-login { }
.page-index { }

/* 组件级别 */  
.login-form { }
.login-form__input { }
.login-form__button { }
.login-form__button--primary { }

/* 状态修饰 */
.button--loading { }
.form--error { }
.text--disabled { }
```

#### 开发工具链 (Development Toolchain)

1. **样式预处理**: 使用 Sass/SCSS
2. **样式检查**: 集成 StyleLint 保证代码质量
3. **设计Token**: 统一管理颜色、字体、间距等设计变量