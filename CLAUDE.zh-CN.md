# CLAUDE.md (中文版)

此文件为 Claude Code (claude.ai/code) 在此代码仓库中工作提供指导。

## 开发命令

### 后端 (Rocket 服务器)
```bash
cd rocket-taro-server

# 开发模式（带调试输出）
cargo run

# 生产构建和运行
cargo build --release
cargo run --release

# 启用调试日志
ROCKET_LOG=debug cargo run
```

### 前端 (Taro 应用)
```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev:h5        # H5 网页开发
npm run dev:weapp     # 微信小程序开发

# 生产构建
npm run build:h5      # 网页构建
npm run build:weapp   # 微信小程序构建
```

### 数据库设置
应用使用 PostgreSQL 数据库，支持自动初始化。数据库表和默认用户在首次启动时自动创建。SQL 初始化文件位于 `database/` 目录。

默认测试账号：
- 用户名：`admin`，密码：`password`（管理员角色）
- 用户名：`test`，密码：`password`（普通用户）

## 架构概览

### 项目结构
这是一个 Rocket + Taro 全栈应用模板，支持网页、H5 和微信小程序部署。

```
rocket-taro-server/     # 主后端应用
├── src/
│   ├── auth/          # 认证守卫和中间件
│   ├── database/      # 数据库连接和操作
│   ├── models/        # 数据模型和结构体
│   ├── routes/        # API 路由处理器
│   └── fairings/      # Rocket 插件（CORS等）
├── frontend/dist/     # 构建的前端资产，静态服务
└── Cargo.toml         # Rust 依赖配置

frontend/              # Taro React 前端
├── src/               # React 组件和页面
├── config/            # Taro 构建配置
└── package.json       # Node.js 依赖配置
```

### 认证系统
应用实现了基于会话的认证系统：

- **模型**：`src/models/auth.rs` 中的 User、UserSession、LoginRequest/Response
- **数据库**：PostgreSQL，包含 users、user_sessions、login_logs 表
- **守卫**：`src/auth/guards.rs` 中的请求守卫，用于路由保护
- **API**：`src/routes/auth.rs` 中的认证端点

关键认证流程：
1. 登录创建会话令牌，存储在数据库和 HTTP-only Cookie 中
2. 请求守卫在受保护路由上验证会话令牌
3. 会话有 7 天过期时间，支持自动清理

### 数据库层
- **连接**：使用 Arc<Mutex<Client>> 池化的单一 PostgreSQL 连接
- **自动初始化**：启动时自动创建表和默认用户
- **操作**：数据库函数位于 `src/database/auth.rs` 和 `src/database/mod.rs`

### API 结构
服务器将路由分为两组挂载：
- `/api/*` - API 端点（健康检查、用户数据）
- `/*` - 认证、用户数据和静态文件服务

### 前端集成
- 前端构建到 `frontend/dist/` 并由 Rocket FileServer 提供服务
- 支持多平台构建（网页、H5、微信小程序）
- 认证状态通过后端 API 调用管理

## 重要注意事项

### 数据库连接
数据库连接字符串目前硬编码在 `src/database/mod.rs` 中。在生产环境中，应将其移至环境变量或配置文件。

### Windows 开发
使用 MSVC 工具链避免 dlltool.exe 问题：
```bash
rustup default stable-x86_64-pc-windows-msvc
```

### 构建脚本
`scripts/` 目录中提供了自动化构建脚本：
- `build-all.bat` - 完整项目构建
- `build-frontend.bat` - 仅前端构建
- `start-rocket.bat` - 启动服务器

### 多平台前端
Taro 前端可以针对多个平台。根据目标平台使用相应的 npm 命令。构建的资产由 Rocket 后端自动提供服务。

## 常用开发任务

### 添加新的 API 端点
1. 在 `src/models/` 中定义数据模型
2. 在 `src/routes/` 中实现路由处理器
3. 在 `src/main.rs` 中注册路由
4. 如需数据库操作，在 `src/database/` 中添加相关函数

### 添加认证保护
使用 `AuthenticatedUser` 守卫保护需要登录的路由：
```rust
#[get("/protected")]
pub fn protected_route(auth_user: AuthenticatedUser) -> Json<ApiResponse<UserInfo>> {
    // 路由逻辑
}
```

### 前端页面开发
1. 在 `frontend/src/pages/` 中创建新页面组件
2. 在 `frontend/src/app.config.js` 中配置路由
3. 使用 `npm run dev:h5` 进行开发调试

### 数据库操作
- 查看 `database/init_auth_tables.sql` 了解表结构
- 数据库操作函数在 `src/database/` 目录中
- 使用 PostgreSQL 客户端连接 `192.168.5.222:5432` 进行调试

## 故障排查

### 常见问题
1. **编译错误**：确保使用 MSVC 工具链
2. **数据库连接失败**：检查 PostgreSQL 服务是否运行
3. **前端 404 错误**：确认前端已构建 (`npm run build:h5`)
4. **认证问题**：检查会话是否过期，查看 `login_logs` 表

### 调试技巧
- 后端：使用 `ROCKET_LOG=debug cargo run` 查看详细日志
- 前端：使用浏览器开发者工具查看网络请求
- 数据库：连接 PostgreSQL 查看会话和用户数据