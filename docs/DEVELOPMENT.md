# 开发指南

## 开发环境设置

### 必需工具安装

#### 1. Rust 环境
```bash
# 安装 Rust（使用官方安装脚本）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows 用户使用 MSVC 工具链
rustup default stable-x86_64-pc-windows-msvc
```

#### 2. Node.js 环境
- 下载地址：https://nodejs.org/
- 推荐版本：16.x LTS 或更高
- 验证安装：
```bash
node --version
npm --version
```

#### 3. Taro CLI（可选）
```bash
# 全局安装 Taro CLI
npm install -g @tarojs/cli
```

### 项目初始化

#### 1. 克隆项目
```bash
git clone [项目地址]
cd Rocket
```

#### 2. 安装依赖
```bash
# 后端依赖（自动处理）
cd rocket-taro-server

# 前端依赖
cd ../frontend
npm install
```

## 开发工作流

### 日常开发流程

#### 1. 启动后端服务
```bash
cd rocket-taro-server

# 开发模式（带热重载）
cargo watch -x run  # 需要安装 cargo-watch

# 或标准模式
cargo run
```

#### 2. 启动前端开发服务器
```bash
# 在新终端窗口
cd frontend

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:weapp
```

#### 3. 访问应用
- **Web**: http://localhost:8000
- **H5 开发**: http://localhost:3000
- **API**: http://localhost:8000/api

### 代码规范

#### Rust 代码规范
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- 遵循 Rust 官方编码规范

#### 前端代码规范
- 使用 ESLint + Prettier
- 遵循 Airbnb JavaScript 风格指南
- TypeScript 严格模式

### 调试技巧

#### 后端调试
```bash
# 启用详细日志
ROCKET_LOG=debug cargo run

# 使用断点调试（VS Code）
# 安装 rust-analyzer 插件
```

#### 前端调试
```bash
# 开发模式带调试信息
npm run dev:h5 -- --verbose

# 使用浏览器开发者工具
# React Developer Tools 插件
```

## 构建和测试

### 构建命令

#### 一键构建（推荐）
```bash
# Windows
scripts\build-all.bat

# 手动步骤
cd frontend && npm run build:h5
cd ../rocket-taro-server && cargo build --release
```

#### 分步构建

**前端构建**:
```bash
cd frontend
npm run build:h5        # Web 版本
npm run build:weapp    # 微信小程序
npm run build:alipay   # 支付宝小程序
```

**后端构建**:
```bash
cd rocket-taro-server
cargo build --release
```

### 测试

#### 后端测试
```bash
cd rocket-taro-server

# 运行所有测试
cargo test

# 运行特定测试
cargo test test_user_routes

# 集成测试
cargo test --test integration_tests
```

#### 前端测试
```bash
cd frontend

# 单元测试
npm test

# E2E 测试（如配置）
npm run test:e2e
```

## 项目配置

### 环境变量

#### 后端配置
创建 `.env` 文件：
```bash
ROCKET_PORT=8000
ROCKET_ADDRESS=0.0.0.0
ROCKET_LOG=normal
```

#### 前端配置
修改 `frontend/config/dev.js`:
```javascript
module.exports = {
  env: {
    NODE_ENV: '"development"',
    API_URL: '"http://localhost:8000/api"',
  },
  // ... 其他配置
};
```

### 配置文件说明

#### Rocket 配置 (Rocket.toml)
```toml
[default]
address = "0.0.0.0"
port = 8000
log_level = "normal"

[default.static_files]
path = "../frontend/dist"
```

#### Taro 配置
- `frontend/config/index.js` - 基础配置
- `frontend/config/dev.js` - 开发环境
- `frontend/config/prod.js` - 生产环境

## 性能优化

### 构建优化

#### 前端优化
- 代码分割（Code Splitting）
- 懒加载（Lazy Loading）
- 压缩和混淆
- CDN 集成

#### 后端优化
- 启用压缩中间件
- 静态文件缓存
- 数据库连接池
- 响应缓存

### 开发优化

#### 热重载
```bash
# 安装 cargo-watch
cargo install cargo-watch

# 使用热重载
cd rocket-taro-server
cargo watch -x run
```

#### 并行开发
- 前后端可独立开发
- 使用代理解决跨域
- 共享 API 类型定义

## 部署指南

### 本地部署

#### 1. 完整构建
```bash
# Windows
scripts\build-all.bat

# 验证构建结果
ls rocket-taro-server/target/release/
ls frontend/dist/
```

#### 2. 启动服务
```bash
cd rocket-taro-server
cargo run --release
```

### 生产部署

#### Docker 部署（示例）
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY rocket-taro-server ./
RUN cargo build --release

FROM debian:bullseye-slim
COPY --from=builder /app/target/release/rocket-taro-server /usr/local/bin/
COPY frontend/dist /app/static
CMD ["rocket-taro-server"]
```

#### 云部署
- **Vercel**: 前端静态部署
- **Railway**: 后端容器部署
- **阿里云**: 传统服务器部署

## 故障排查

### 开发环境常见问题

#### 1. 依赖安装失败
```bash
# 清理缓存
rm -rf ~/.cargo/registry
rm -rf frontend/node_modules

# 重新安装
cargo build
npm install
```

#### 2. 端口冲突
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000

# 使用不同端口
ROCKET_PORT=8080 cargo run
```

#### 3. 构建失败
```bash
# 清理构建缓存
cargo clean
cd frontend && rm -rf dist

# 重新构建
cargo build --release
npm run build:h5
```

### 调试工具

#### 推荐工具
- **后端**: VS Code + rust-analyzer
- **前端**: VS Code + Taro 插件
- **API**: Postman / Insomnia
- **数据库**: DBeaver / DataGrip

#### 日志查看
```bash
# 后端日志
ROCKET_LOG=debug cargo run

# 前端日志
npm run dev:h5 -- --verbose
```

## 贡献指南

### 提交规范
- 使用 Conventional Commits
- 添加适当的测试
- 更新相关文档
- 通过 CI 检查

### 分支策略
- `main`: 稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

### 代码审查
- 创建 Pull Request
- 添加描述和测试
- 通过 CI 检查
- 代码审查后合并