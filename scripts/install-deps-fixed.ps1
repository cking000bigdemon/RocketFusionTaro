#!/usr/bin/env pwsh
# Taro + Rocket Dependencies Installation Script

Write-Host "=== Taro + Rocket Dependencies Installation ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Admin check
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (!$isAdmin) {
    Write-Host "WARNING: Run as administrator for best results" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell -> Run as administrator" -ForegroundColor Yellow
    Write-Host ""
}

# Install Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "Node.js is already installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "Installing Node.js LTS..." -ForegroundColor Blue
    
    try {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        Write-Host "Node.js installation completed" -ForegroundColor Green
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Start-Sleep -Seconds 5
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "Node.js verified: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "Node.js installation may require restart" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Failed to install Node.js via winget" -ForegroundColor Red
        Write-Host "Please download from: https://nodejs.org/" -ForegroundColor Yellow
    }
}

# Install Taro CLI
Write-Host "Checking Taro CLI..." -ForegroundColor Yellow

$taroVersion = taro --version 2>$null
if ($taroVersion) {
    Write-Host "Taro CLI is already installed: $taroVersion" -ForegroundColor Green
} else {
    Write-Host "Installing Taro CLI..." -ForegroundColor Blue
    
    try {
        npm install -g @tarojs/cli
        $taroVersion = taro --version 2>$null
        if ($taroVersion) {
            Write-Host "Taro CLI installation completed: $taroVersion" -ForegroundColor Green
        } else {
            Write-Host "Taro CLI installation completed but not found in PATH" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Failed to install Taro CLI" -ForegroundColor Red
        Write-Host "Manual command: npm install -g @tarojs/cli" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Installation Summary ===" -ForegroundColor Green
Write-Host "1. Run: .\scripts\check-env.ps1" -ForegroundColor Blue
Write-Host "2. Restart terminal if needed" -ForegroundColor Blue
Write-Host "3. Continue with Taro integration" -ForegroundColor Blue