# Rocket-Taro Project Documentation

> 🌏 **Language Selection**: **English** | [中文](../zh-CN/README.md) | [Return to Project Root](../../README.md)

Welcome to the English documentation for the Rocket-Taro project! This project is a full-stack application template based on the Rust Rocket framework and Taro cross-platform frontend.

## 📚 Documentation Navigation

### 🚀 Quick Start
- [Development Guide](guides/development.md) - Complete development environment setup and workflow
- [API Reference](api/api-reference.md) - Detailed API endpoint documentation

### 🛠️ System Guides
- [Database User Guide](guides/database-guide.md) - Database system architecture, configuration, and usage
- [Cache System Guide](guides/cache-guide.md) - Redis cache system usage instructions

### 📋 Project Information
- [Development Summary](project/development-summary.md) - User authentication system development summary
- [Optimization Report](project/optimization-report.md) - Project optimization completion report

### 📦 Version Information
- [Release Template](releases/template.md) - Standard release notes template
- [v1.1.0 Release Notes](releases/v1.1.0.md) - Documentation internationalization version release

## 🏗️ Project Architecture

This project adopts a modern full-stack architecture:

### Backend (Rocket Server)
- **Framework**: Rust + Rocket Web Framework
- **Database**: PostgreSQL 
- **Cache**: Redis
- **Authentication**: Session-based authentication mechanism
- **Security**: bcrypt password encryption, session management

### Frontend (Taro Application)
- **Framework**: Taro 3.6.23 + React 18
- **State Management**: Zustand
- **Platform Support**: H5, WeChat Mini Program, Web
- **Build Tools**: Webpack 5 + Babel

## ⚡ Quick Start

### 1. Environment Setup
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows users use MSVC toolchain
rustup default stable-x86_64-pc-windows-msvc

# Install Node.js (recommended 16.x LTS or higher)
```

### 2. Start Backend Service
```bash
cd rocket-taro-server
cargo run
```

### 3. Start Frontend Development
```bash
cd frontend

# H5 development
npm run dev:h5

# WeChat Mini Program development  
npm run dev:weapp
```

## 🔐 Default Accounts

The system comes with two preset test accounts:

| Username | Password | Role             |
|----------|----------|------------------|
| admin    | password | System Administrator |
| test     | password | Regular User     |

## 📖 Documentation Internationalization

This project has established a complete bilingual Chinese-English documentation system:

- **Chinese Documentation**: `docs/zh-CN/` directory
- **English Documentation**: `docs/en/` directory
- **Directory Structure**: Both languages maintain identical directory structures
- **Synchronized Updates**: All important documents provide both Chinese and English versions

## 🤝 Contribution Guide

### Documentation Contribution
- New documents must be created in both Chinese and English versions simultaneously
- Document updates must synchronize both language versions
- Follow established documentation structure and naming conventions

### Development Contribution
- Each new feature development must include version documentation
- Use the provided [release notes template](releases/template.md)
- Ensure code quality and security

## 📞 Support & Feedback

- **Technical Support**: Submit issues via GitHub Issues
- **Feature Requests**: Discuss via GitHub Discussions
- **Documentation Issues**: Submit issues directly on relevant documentation pages
- **Security Issues**: Please report security-related issues through private channels

## 📄 License

This project uses an open source license. For specific license information, please refer to the LICENSE file in the project root directory.

---

**Maintenance Team**: Rocket-Taro Development Team  
**Last Updated**: 2025-08-22  
**Documentation Version**: v1.1.0