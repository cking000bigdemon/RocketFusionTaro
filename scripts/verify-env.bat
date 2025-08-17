@echo off
echo === Environment Verification ===
echo.

setlocal enabledelayedexpansion

:: Check Node.js
echo Checking Node.js...
"C:\Program Files\nodejs\node.exe" --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)

:: Check npm
echo.
echo Checking npm...
"C:\Program Files\nodejs\npm.cmd" --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found
    pause
    exit /b 1
)

:: Check Taro CLI
echo.
echo Checking Taro CLI...
"C:\Program Files\nodejs\npm.cmd" list -g @tarojs/cli
if %errorlevel% neq 0 (
    echo WARNING: Taro CLI not found globally
    echo Installing Taro CLI...
    "C:\Program Files\nodejs\npm.cmd" install -g @tarojs/cli
)

echo.
echo === PATH Configuration ===
echo Adding Node.js to PATH...
set PATH=%PATH%;C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm

echo.
echo === Final Verification ===
echo Node.js: 
node --version
echo npm: 
npm --version
echo Taro CLI: 
taro --version

echo.
echo === Environment Ready ===
pause