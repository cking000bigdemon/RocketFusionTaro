# Rocket + Taro 全栈应用模板

一个现代化的全栈应用模板，基于 Rocket 后端和 Taro 前端，支持 Web、H5 和微信小程序多端运行。

## 🚀 快速开始

### 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Rust | ≥ 1.70.0 | 后端开发语言 |
| Node.js | ≥ 16.0.0 | 前端运行环境 |
| npm | ≥ 7.0.0 | 前端包管理器 |

### Windows 用户特别注意

**推荐配置**：
```bash
# 使用 MSVC 工具链（避免 GNU 工具链的 dlltool.exe 问题）
rustup default stable-x86_64-pc-windows-msvc
```

### 一键启动

#### 1. 克隆项目
```bash
git clone [项目地址]
cd Rocket
```

#### 2. 构建项目（Windows）
```bash
# 一键构建脚本
scripts\build-all.bat
```

#### 3. 启动服务
```bash
cd rocket-taro-server
cargo run --release
```

访问 http://localhost:8000 查看应用

## 📁 项目结构

```
Rocket/
├── rocket-taro-server/     # Rocket 后端服务
│   ├── src/
│   │   ├── main.rs        # 主程序入口
│   │   ├── routes/        # API 路由
│   │   └── models/        # 数据模型
│   └── Cargo.toml         # Rust 依赖
├── frontend/              # Taro 前端项目
│   ├── src/              # React 源码
│   ├── config/           # Taro 配置
│   └── package.json      # 前端依赖
├── scripts/               # 构建脚本
│   ├── build-all.bat     # 一键构建
│   ├── build-frontend.bat # 前端构建
│   └── start-rocket.bat  # 启动服务器
└── docs/                 # 项目文档
```

## 🛠️ 开发指南

### 后端开发

```bash
cd rocket-taro-server

# 开发模式
cargo run

# 生产构建
cargo build --release
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev:h5        # H5 开发
npm run dev:weapp     # 微信小程序

# 生产构建
npm run build:h5       # Web 构建
npm run build:weapp   # 小程序构建
```

## 🔧 构建选项

### 支持的平台

- ✅ **Web 浏览器** (Chrome, Firefox, Safari, Edge)
- ✅ **H5 移动端** (iOS, Android)
- ✅ **微信小程序**
- ✅ **支付宝小程序** (需配置)

### 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev:h5` | H5 开发模式 |
| `npm run build:h5` | H5 生产构建 |
| `npm run dev:weapp` | 微信小程序开发 |
| `npm run build:weapp` | 微信小程序构建 |

## 📋 API 接口

### 健康检查
```
GET /api/health
```

### 用户管理
```
GET    /api/users        # 获取用户列表
GET    /api/users/:id    # 获取单个用户
POST   /api/users        # 创建用户
PUT    /api/users/:id    # 更新用户
DELETE /api/users/:id    # 删除用户
```

## 🐛 故障排查

### 常见问题

#### 1. 编译错误：dlltool.exe 缺失
**症状**: Windows 下编译失败，提示 dlltool.exe 缺失
**解决**:
```bash
# 切换到 MSVC 工具链
rustup default stable-x86_64-pc-windows-msvc
cargo clean
cargo build
```

#### 2. 前端构建失败
**症状**: npm 命令无法识别或构建失败
**解决**:
```bash
# 确保 Node.js 已安装
node --version
npm --version

# 重新安装依赖
cd frontend
npm install
```

#### 3. 端口冲突
**症状**: 8000端口被占用
**解决**:
```bash
# 使用不同端口
ROCKET_PORT=8080 cargo run
```

#### 4. 静态文件 404
**症状**: 访问页面显示 404
**解决**:
1. 确认前端已构建：`npm run build:h5`
2. 检查构建产物：查看 `frontend/dist` 目录
3. 验证服务器配置

### 调试技巧

#### 后端调试
```bash
# 启用详细日志
ROCKET_LOG=debug cargo run
```

#### 前端调试
```bash
# 开发模式带调试信息
npm run dev:h5 -- --verbose
```

## 📖 文档

- [开发指南](docs/taro-integration/README.md) - 详细开发说明
- [API 文档](docs/taro-integration/README.md#api-接口) - 接口文档
- [故障排查](docs/taro-integration/README.md#故障排查) - 常见问题解决

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
