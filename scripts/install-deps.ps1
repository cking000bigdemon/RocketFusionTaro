#!/usr/bin/env pwsh
# Taro + Rocket 依赖安装脚本

Write-Host "=== Taro + Rocket 依赖安装 ===" -ForegroundColor Green
Write-Host "时间: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# 以管理员身份检查
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (!$isAdmin) {
    Write-Host "⚠️  建议以管理员身份运行此脚本" -ForegroundColor Yellow
    Write-Host "   右键PowerShell -> 以管理员身份运行" -ForegroundColor Yellow
    Write-Host ""
}

# 颜色定义
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"
$RED = "Red"

# 安装函数
function Install-NodeJS {
    Write-Host "🔍 检查Node.js..." -ForegroundColor $YELLOW
    
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor $GREEN
            return $true
        }
    } catch {
        # Node.js未安装，继续安装
    }
    
    Write-Host "📥 正在安装Node.js LTS..." -ForegroundColor $BLUE
    
    try {
        # 使用winget安装Node.js
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # 验证安装
        Start-Sleep -Seconds 5
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js 安装成功: $nodeVersion" -ForegroundColor $GREEN
            return $true
        } else {
            Write-Host "❌ Node.js 安装失败" -ForegroundColor $RED
            return $false
        }
    } catch {
        Write-Host "❌ Node.js 安装失败: $_" -ForegroundColor $RED
        Write-Host "请手动下载安装: https://nodejs.org/" -ForegroundColor $YELLOW
        return $false
    }
}

function Install-TaroCLI {
    Write-Host "🔍 检查Taro CLI..." -ForegroundColor $YELLOW
    
    try {
        $taroVersion = taro --version 2>$null
        if ($taroVersion) {
            Write-Host "✅ Taro CLI 已安装: $taroVersion" -ForegroundColor $GREEN
            return $true
        }
    } catch {
        # Taro CLI未安装，继续安装
    }
    
    Write-Host "📥 正在安装Taro CLI..." -ForegroundColor $BLUE
    
    try {
        npm install -g @tarojs/cli
        
        # 验证安装
        $taroVersion = taro --version 2>$null
        if ($taroVersion) {
            Write-Host "✅ Taro CLI 安装成功: $taroVersion" -ForegroundColor $GREEN
            return $true
        } else {
            Write-Host "❌ Taro CLI 安装失败" -ForegroundColor $RED
            return $false
        }
    } catch {
        Write-Host "❌ Taro CLI 安装失败: $_" -ForegroundColor $RED
        return $false
    }
}

# 主安装流程
Write-Host "=== 开始安装依赖 ===" -ForegroundColor Green

# 1. 安装Node.js
$nodeSuccess = Install-NodeJS

if ($nodeSuccess) {
    # 2. 安装Taro CLI
    $taroSuccess = Install-TaroCLI
    
    if ($taroSuccess) {
        Write-Host ""
        Write-Host "🎉 所有依赖安装完成!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== 后续操作 ===" -ForegroundColor Green
        Write-Host "1. 重新打开终端或运行: refreshenv" -ForegroundColor $BLUE
        Write-Host "2. 验证环境: .\scripts\check-env.ps1" -ForegroundColor $BLUE
        Write-Host "3. 继续Taro集成方案" -ForegroundColor $BLUE
    } else {
        Write-Host ""
        Write-Host "⚠️  Taro CLI 安装失败，请手动安装" -ForegroundColor $YELLOW
        Write-Host "手动运行: npm install -g @tarojs/cli" -ForegroundColor $BLUE
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Node.js 安装失败，请手动安装" -ForegroundColor $YELLOW
    Write-Host "手动下载: https://nodejs.org/" -ForegroundColor $BLUE
}

Write-Host ""
Write-Host "=== 安装完成 ===" -ForegroundColor Green