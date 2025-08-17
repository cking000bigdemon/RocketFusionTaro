# Rocket + Taro 前后端集成项目

## 项目简介

这是一个基于 Rocket 后端和 Taro 前端的现代化全栈应用模板，支持 Web、H5 和微信小程序多端运行。

### 技术栈
- **后端**: Rocket (Rust Web框架)
- **前端**: Taro + React + TypeScript
- **构建**: Cargo + Webpack
- **部署**: 支持多平台部署

## 快速开始

### 环境要求

#### 必需环境
- **Rust**: 1.70.0 或更高版本
- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本

#### Windows 特定要求
- **MSVC 工具链**: 推荐用于 Windows 开发
- **Visual Studio Build Tools**: 包含 C++ 构建工具

### 安装步骤

#### 1. 克隆项目
```bash
git clone [项目地址]
cd Rocket
```

#### 2. 安装 Rust 工具链
```bash
# 安装 MSVC 工具链（推荐）
rustup default stable-x86_64-pc-windows-msvc

# 验证安装
rustc --version
cargo --version
```

#### 3. 安装前端依赖
```bash
cd frontend
npm install
```

#### 4. 构建项目
```bash
# 使用一键构建脚本（Windows）
scripts\build-all.bat

# 或使用手动步骤
cd frontend && npm run build:h5
cd ../rocket-taro-server && cargo build --release
```

#### 5. 启动服务
```bash
# 启动 Rocket 服务器
cd rocket-taro-server
cargo run --release

# 服务器将在 http://localhost:8000 启动
```

## 开发指南

### 开发环境配置

#### 后端开发
```bash
cd rocket-taro-server

# 开发模式（自动重载）
cargo watch -x run

# 运行测试
cargo test
```

#### 前端开发
```bash
cd frontend

# 启动 H5 开发服务器
npm run dev:h5

# 启动微信小程序开发
npm run dev:weapp

# 构建生产版本
npm run build:h5
```

### 项目结构

```
Rocket/
├── rocket-taro-server/     # Rocket 后端服务
│   ├── src/
│   │   ├── main.rs        # 主程序入口
│   │   ├── routes/        # API 路由
│   │   └── models/        # 数据模型
│   └── Cargo.toml         # Rust 依赖配置
├── frontend/              # Taro 前端项目
│   ├── src/              # React 源码
│   ├── config/           # Taro 配置
│   └── package.json      # 前端依赖
├── scripts/               # 构建和启动脚本
│   ├── build-all.bat     # 一键构建（Windows）
│   ├── build-frontend.bat # 前端构建
│   └── start-rocket.bat  # 启动服务器
└── docs/                 # 项目文档
```

## 构建和部署

### 一键构建

#### Windows
```bash
scripts\build-all.bat
```

#### Unix/Linux/Mac
```bash
./scripts/build-all.sh  # 如提供
```

### 手动构建步骤

#### 1. 构建前端
```bash
cd frontend
npm install
npm run build:h5    # Web 版本
npm run build:weapp # 微信小程序
```

#### 2. 构建后端
```bash
cd rocket-taro-server
cargo build --release
```

### 部署选项

#### 本地部署
1. 执行完整构建
2. 运行 `cargo run --release`
3. 访问 http://localhost:8000

#### 生产部署
- **静态托管**: 将构建产物部署到 CDN
- **服务器部署**: 使用 Docker 容器化部署
- **云部署**: 支持各大云平台

## API 文档

### 健康检查接口
```
GET /api/health
```

### 用户管理接口
```
GET    /api/users        # 获取用户列表
GET    /api/users/:id    # 获取单个用户
POST   /api/users        # 创建用户
PUT    /api/users/:id    # 更新用户
DELETE /api/users/:id    # 删除用户
```

### 响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": { /* 响应数据 */ }
}
```

## 故障排查

### 常见问题

#### 1. 编译错误：dlltool.exe 缺失
**问题**: Windows 下使用 GNU 工具链导致 dlltool.exe 缺失
**解决**:
```bash
# 切换到 MSVC 工具链
rustup default stable-x86_64-pc-windows-msvc
cargo clean
cargo build
```

#### 2. 前端构建失败
**问题**: Node.js 版本不兼容或依赖缺失
**解决**:
```bash
# 检查 Node.js 版本
node --version  # 需要 >= 16.0.0

# 清理并重新安装依赖
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. 端口冲突
**问题**: 8000端口被占用
**解决**:
```bash
# 修改 Rocket.toml 中的端口配置
# 或在启动时指定端口
ROCKET_PORT=8080 cargo run
```

#### 4. 静态文件 404
**问题**: 前端构建产物未正确部署
**解决**:
1. 确认前端构建成功
2. 检查构建产物路径
3. 验证 Rocket 静态文件配置

### 调试技巧

#### 后端调试
```bash
# 启用详细日志
ROCKET_LOG=debug cargo run

# 使用 IDE 调试
# 在 VS Code 中使用调试配置
```

#### 前端调试
```bash
# 开发模式启用调试
npm run dev:h5 -- --verbose

# 使用浏览器开发者工具
```

## 支持的平台

### 开发环境
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Ubuntu 18.04+

### 目标平台
- ✅ Web 浏览器 (Chrome, Firefox, Safari, Edge)
- ✅ 微信小程序
- ✅ H5 移动端
- ✅ 支付宝小程序 (需额外配置)

## 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request

### 代码规范
- **Rust**: 遵循 Rust 官方代码风格
- **前端**: 遵循 Airbnb JavaScript 风格指南
- **提交信息**: 使用 Conventional Commits

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 获取帮助

- **Issues**: 在 GitHub 提交 Issue
- **Discussions**: 参与项目讨论
- **文档**: 查看 docs/ 目录下的详细文档