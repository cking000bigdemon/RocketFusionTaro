# Taro + Rocket 单仓库集成方案 - 待办事项清单

## 🔴 立即需要处理的事项

### 1. 环境配置问题
**发现**: Node.js未安装，需要先安装Node.js和npm

#### 解决方案A: 使用Node.js官方安装程序
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载 LTS版本 (推荐v18.x.x或v20.x.x)
3. 运行安装程序，确保添加到PATH
4. 验证安装:
   ```bash
   node --version
   npm --version
   ```

#### 解决方案B: 使用nvm-windows (推荐)
1. 下载 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
2. 安装后运行:
   ```bash
   nvm install 18.17.0
   nvm use 18.17.0
   node --version
   ```

### 2. Taro CLI安装
**步骤**:
```bash
npm install -g @tarojs/cli
```

### 3. Rust环境确认
**验证命令**:
```bash
cargo --version
rustc --version
```

---

## 🟡 可选优化事项

### 1. 开发工具配置
- [ ] VS Code插件安装
  - [ ] Rust Extension Pack
  - [ ] Taro Snippets
  - [ ] Tailwind CSS IntelliSense
- [ ] Git配置 (用户名和邮箱)

### 2. 包管理器选择
- [ ] 使用pnpm (比npm更快)
  ```bash
  npm install -g pnpm
  ```

### 3. 环境变量模板
创建 `.env.example` 文件:
```bash
# Rocket配置
ROCKET_PORT=8000
ROCKET_ENV=development

# 数据库配置
DATABASE_URL=sqlite://rocket.db

# Taro配置
TARO_APP_ID=touristappid
TARO_API_URL=http://localhost:8000/api
```

---

## 🔧 快速检查清单

### 环境验证脚本
创建 `scripts/check-env.ps1`:
```powershell
Write-Host "=== 环境检查 ===" -ForegroundColor Green

# 检查Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js: 未安装" -ForegroundColor Red
}

# 检查npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✅ npm: $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "❌ npm: 未安装" -ForegroundColor Red
}

# 检查Taro CLI
if (Get-Command taro -ErrorAction SilentlyContinue) {
    Write-Host "✅ Taro CLI: $(taro --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Taro CLI: 未安装" -ForegroundColor Red
}

# 检查Rust
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Write-Host "✅ Cargo: $(cargo --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Cargo: 未安装" -ForegroundColor Red
}

Write-Host "=== 检查完成 ===" -ForegroundColor Green
```

### 一键安装脚本
创建 `scripts/install-deps.ps1`:
```powershell
Write-Host "=== 安装依赖 ===" -ForegroundColor Green

# 安装Node.js (如果未安装)
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装Node.js..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS
}

# 安装Taro CLI
Write-Host "正在安装Taro CLI..." -ForegroundColor Yellow
npm install -g @tarojs/cli

Write-Host "✅ 所有依赖安装完成!" -ForegroundColor Green
Write-Host "请重新打开终端或运行: refreshenv" -ForegroundColor Blue
```

---

## 🚀 下一步操作指引

### 立即执行步骤:
1. **安装Node.js**: 选择上述方案A或B
2. **运行验证脚本**: `powershell -ExecutionPolicy Bypass -File scripts/check-env.ps1`
3. **安装完成后**: 重新启动6A工作流

### 环境就绪后:
1. 重新运行任务1: 环境准备
2. 继续执行后续任务
3. 每完成一个任务更新验收记录

---

## 📞 需要帮助?

如果遇到环境安装问题:
1. 检查网络连接
2. 以管理员身份运行PowerShell
3. 查看具体错误信息
4. 提供错误日志寻求帮助