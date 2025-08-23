# Rocket-Taro 项目文档

> 🌏 **语言选择**: [English](../en/README.md) | **中文** | [Return to Project Root](../../README.md)

欢迎访问 Rocket-Taro 项目的中文文档！本项目是一个基于 Rust Rocket 框架和 Taro 跨平台前端的全栈应用模板。

## 📚 文档导航

### 🚀 快速开始
- [开发指南](guides/development.md) - 完整的开发环境设置和工作流程
- [API 接口文档](api/api-reference.md) - 详细的 API 端点说明

### 🛠️ 系统指南
- [数据库使用指南](guides/database-guide.md) - 数据库系统架构、配置和使用方法
- [缓存系统指南](guides/cache-guide.md) - Redis 缓存系统使用说明

### 🎯 路由系统 (后端驱动架构)
- [路由架构设计](architecture/backend-driven-routing.md) - 后端驱动路由系统架构详解
- [路由开发指南](guides/routing-development-guide.md) - 如何使用后端驱动路由系统开发
- [路由指令API](api/route-command-api.md) - 完整的路由指令API规范文档

### 📋 项目信息
- [项目开发总结](project/development-summary.md) - 用户认证系统开发总结
- [项目优化报告](project/optimization-report.md) - 项目优化完成情况报告

### 📦 版本信息
- [版本说明模板](releases/template.md) - 标准版本发布说明模板
- [v1.1.0 发布说明](releases/v1.1.0.md) - 文档国际化版本发布说明

## 🏗️ 项目架构

本项目采用现代化的**后端驱动路由**全栈架构：

### 🚀 核心特性
- **后端驱动路由**: 业务逻辑集中在后端，前端作为执行器响应路由指令
- **多端一致性**: H5、微信小程序执行相同的业务流程
- **动态流程控制**: 后端可实时调整用户体验流程
- **简化前端逻辑**: 前端专注于UI展示和用户交互

### 后端 (Rocket Server)
- **框架**: Rust + Rocket Web 框架
- **架构模式**: 用例层(UseCase) + 路由指令生成
- **数据库**: PostgreSQL 
- **缓存**: Redis
- **认证**: 基于 Session 的认证机制
- **安全**: bcrypt 密码加密，会话管理

### 前端 (Taro Application)
- **框架**: Taro 3.6.23 + React 18
- **路由处理**: 路由指令解析器(RouterHandler)
- **状态管理**: Zustand
- **平台支持**: H5、微信小程序、Web
- **构建工具**: Webpack 5 + Babel

## ⚡ 快速开始

### 1. 环境准备
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows 用户使用 MSVC 工具链
rustup default stable-x86_64-pc-windows-msvc

# 安装 Node.js (推荐 16.x LTS 或更高)
```

### 2. 启动后端服务
```bash
cd rocket-taro-server
cargo run
```

### 3. 启动前端开发
```bash
cd frontend

# H5 开发
npm run dev:h5

# 微信小程序开发  
npm run dev:weapp
```

## 🔐 默认账户

系统预置了两个测试账户：

| 用户名 | 密码     | 角色       |
|--------|----------|------------|
| admin  | password | 系统管理员 |
| test   | password | 普通用户   |

## 📖 文档国际化

本项目建立了完整的中英文双语文档体系：

- **中文文档**: `docs/zh-CN/` 目录
- **英文文档**: `docs/en/` 目录
- **目录结构**: 两种语言保持完全一致的目录结构
- **同步更新**: 所有重要文档都提供中英文两个版本

## 🤝 贡献指南

### 文档贡献
- 新增文档时必须同时创建中英文版本
- 更新文档时必须同步更新两种语言版本
- 遵循既定的文档结构和命名规范

### 开发贡献
- 每次新功能开发必须包含版本说明文档
- 使用提供的[版本说明模板](releases/template.md)
- 确保代码质量和安全性

## 📞 支持与反馈

- **技术支持**: 通过 GitHub Issues 提交问题
- **功能建议**: 通过 GitHub Discussions 讨论
- **文档问题**: 直接在相应文档页面提交 Issue
- **安全问题**: 请通过私有渠道报告安全相关问题

## 📄 许可证

本项目采用开源许可证，具体许可证信息请查看项目根目录的 LICENSE 文件。

---

**维护团队**: Rocket-Taro 开发团队  
**最后更新**: 2025-08-22  
**文档版本**: v1.1.0