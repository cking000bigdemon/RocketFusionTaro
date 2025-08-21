# 项目初始化文档

本目录包含 Rocket + Taro 全栈项目的初始化文档和配置说明。

## 文档说明

### 📋 [项目初始化概要](./项目初始化概要.md)
- 项目基本信息和技术架构概览
- 项目结构说明
- 初始化检查清单
- 快速启动指南

### 🔧 [环境配置检查](./环境配置检查.md)  
- 系统环境分析
- Rust 和 Node.js 环境验证
- Git 状态检查
- 潜在问题识别和解决建议

### ⚙️ [技术栈配置总结](./技术栈配置总结.md)
- 详细的技术选型说明
- 前后端配置细节
- 开发工具和构建配置
- 性能优化和安全配置建议

## 初始化完成状态

✅ **已完成的配置**:
- Rust 后端服务器 (Rocket 0.5.0)
- Taro 前端应用 (多平台支持)
- 构建脚本和开发工具
- 基础文档和示例

⚠️ **需要手动配置**:
- Node.js 依赖安装: `cd frontend && npm install`
- 环境验证: 运行 `scripts/check-env-fixed.ps1`
- 数据库配置 (可选)
- 认证系统 (可选)

## 快速开始

### 1. 环境检查
```bash
# 验证 Rust 环境
rustc --version
cargo --version

# 验证 Node.js 环境
node --version
npm --version
```

### 2. 安装依赖
```bash
# 安装前端依赖
cd frontend
npm install
```

### 3. 启动开发环境
```bash
# 启动后端 (端口 8000)
cd rocket-taro-server
cargo run

# 启动前端 (端口 10086, 新终端)
cd frontend  
npm run dev:h5
```

### 4. 验证部署
- 后端 API: http://localhost:8000/api/health
- 前端应用: http://localhost:10086

## 相关文档

- [主项目 README](../../README.md) - 项目总体说明
- [开发指南](../taro-integration/README.md) - 详细开发文档
- [架构评审](../architecture-review/) - 架构设计文档

## 技术支持

如遇到问题，请参考：
1. [环境配置检查](./环境配置检查.md#潜在问题与建议)
2. [主项目故障排查](../../README.md#故障排查)
3. 提交 Issue 到项目仓库

---

*初始化文档生成时间: 2025-08-21*