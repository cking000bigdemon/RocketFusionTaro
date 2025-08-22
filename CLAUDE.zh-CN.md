# CLAUDE.zh-CN.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供中文指导。

## 开发命令

### 后端 (Rocket 服务器)
```bash
cd rocket-taro-server

# 开发模式运行（带结构化日志）
cargo run

# 生产构建和运行
cargo build --release
cargo run --release

# 代码质量检查
cargo check
cargo clippy

# 环境变量（可选）
export DATABASE_URL="host=192.168.5.222 port=5432 user=user_ck password=ck320621 dbname=postgres"
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
应用使用 PostgreSQL 数据库并支持自动初始化。数据库表和默认用户在首次启动时自动创建。SQL 初始化文件位于 `database/` 目录。

默认测试账户：
- 用户名：`admin`，密码：`password`（管理员角色）
- 用户名：`test`，密码：`password`（普通用户）

## 架构概述

### 项目结构
这是一个支持 Web、H5 和微信小程序部署的 Rocket + Taro 全栈应用模板。

```
rocket-taro-server/     # 主后端应用
├── src/
│   ├── auth/          # 认证守卫和中间件
│   ├── database/      # 数据库连接和操作
│   ├── models/        # 数据模型和结构体
│   ├── routes/        # API 路由处理器
│   └── fairings/      # Rocket fairings (CORS 等)
├── frontend/dist/     # 静态服务的前端构建资源
└── Cargo.toml         # Rust 依赖

frontend/              # Taro React 前端
├── src/               # React 组件和页面
├── config/            # Taro 构建配置
└── package.json       # Node.js 依赖
```

### 认证系统
应用实现了基于会话的认证系统：

- **模型**：`src/models/auth.rs` 中的 User、UserSession、LoginRequest/Response
- **数据库**：PostgreSQL，包含 user、user_sessions、login_logs 表
- **守卫**：`src/auth/guards.rs` 中的请求守卫用于路由保护
- **API**：`src/routes/auth.rs` 中的认证端点

关键认证流程：
1. 登录创建存储在数据库和 HTTP-only cookie 中的会话令牌
2. 请求守卫在受保护的路由上验证会话令牌
3. 会话有 7 天有效期，自动清理过期会话

### 数据库层
- **连接**：使用 Arc<Mutex<Client>> 池的单一 PostgreSQL 连接
- **自动初始化**：启动时自动创建表和默认用户
- **操作**：`src/database/auth.rs` 和 `src/database/mod.rs` 中的数据库函数

### API 结构
服务器挂载两组路由：
- `/api/*` - API 端点（健康检查、用户数据）
- `/*` - 认证、用户数据和静态文件服务

### 前端集成
- 前端构建到 `frontend/dist/` 并由 Rocket FileServer 提供服务
- 支持多平台构建（Web、H5、微信小程序）
- 通过 API 调用后端管理认证状态

## 重要说明

### 数据库连接
数据库连接字符串目前硬编码在 `src/database/mod.rs` 中。在生产环境中，应该移至环境变量或配置文件。

### Windows 开发
使用 MSVC 工具链以避免 dlltool.exe 问题：
```bash
rustup default stable-x86_64-pc-windows-msvc
```

### 构建脚本
`scripts/` 目录中提供自动化构建脚本：
- `build-all.bat` - 完整项目构建
- `build-frontend.bat` - 仅前端构建
- `start-rocket.bat` - 启动服务器

### 多平台前端
Taro 前端可以针对多个平台。根据目标平台使用适当的 npm 命令。构建的资源由 Rocket 后端自动提供服务。

## 开发规范

### 版本文档管理
- **强制要求**：每次新功能开发都必须包含单独的版本说明文档
- **双语要求**：所有重要文档都必须提供中英文两个版本
- **目录结构**：使用 docs/en/ 和 docs/zh-CN/ 进行语言分离
- **文档位置**：
  - 英文版本：docs/en/releases/vX.X.X.md
  - 中文版本：docs/zh-CN/releases/vX.X.X.md
- **模板使用**：
  - 英文模板：docs/en/releases/template.md
  - 中文模板：docs/zh-CN/releases/template.md

### 文档国际化标准
- **目录结构**：
  - 英文文档统一放在 `docs/en/` 目录下
  - 中文文档统一放在 `docs/zh-CN/` 目录下
  - 两种语言的子目录结构必须完全一致
- **内容要求**：
  - 中英文版本内容必须保持同步
  - 使用统一的中英文术语对照
  - 代码示例和配置保持一致
  - 文件名在两种语言目录中必须一致
- **维护责任**：
  - 每次更新文档时必须同时更新中英文版本
  - 新增文档时必须同时创建两种语言版本
  - 删除文档时必须同时删除两种语言版本

### 文档更新流程
1. 开发新功能前在 docs/en/releases/ 和 docs/zh-CN/releases/ 中创建版本文档草稿
2. 开发过程中持续更新两种语言目录下的相关文档
3. 功能完成后更新相关API文档、用户指南等的中英文版本
4. 发布前检查 docs/en/ 和 docs/zh-CN/ 目录结构的一致性
5. 确保对应文件的内容同步且准确

### 文档导航
- 在每个语言的根目录下提供到另一种语言的导航链接
- 在 README.md 中提供文档语言选择指引