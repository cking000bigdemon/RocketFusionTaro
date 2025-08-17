#!/usr/bin/env pwsh
# Environment Check Script for Taro + Rocket Integration

Write-Host "=== Environment Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

$allGood = $true

function Check-Command {
    param(
        [string]$Command,
        [string]$DisplayName,
        [string]$RequiredVersion
    )
    
    Write-Host "Checking $DisplayName..." -ForegroundColor Yellow
    
    try {
        $version = & $Command --version 2>$null
        if ($version) {
            Write-Host "✅ $DisplayName: $version" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $DisplayName: command failed" -ForegroundColor Red
            $script:allGood = $false
            return $false
        }
    } catch {
        Write-Host "❌ $DisplayName: not found" -ForegroundColor Red
        $script:allGood = $false
        return $false
    }
}

# Check all required tools
Check-Command -Command "node" -DisplayName "Node.js"
Check-Command -Command "npm" -DisplayName "npm"
Check-Command -Command "taro" -DisplayName "Taro CLI"
Check-Command -Command "cargo" -DisplayName "Cargo"
Check-Command -Command "rustc" -DisplayName "Rustc"

Write-Host ""

if ($allGood) {
    Write-Host "🎉 All environment checks passed!" -ForegroundColor Green
    Write-Host "Ready to proceed with Taro integration" -ForegroundColor Blue
} else {
    Write-Host "⚠️  Some tools are missing or not configured properly" -ForegroundColor Yellow
    Write-Host "Please install missing tools and run this check again" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. If Node.js is missing: Install from https://nodejs.org/" -ForegroundColor Blue
Write-Host "2. If Taro CLI is missing: npm install -g @tarojs/cli" -ForegroundColor Blue
Write-Host "3. Restart terminal after installations" -ForegroundColor Blue