@echo off
echo Building Rocket Taro Integration...
echo.

REM Build frontend first
echo 1. Building Taro frontend...
cd /d %~dp0\..\frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo Frontend dependencies installation failed!
        pause
        exit /b 1
    )
)

echo Building frontend for production...
call npm run build:h5
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)

echo.
echo 2. Building Rocket server...
cd /d %~dp0\..\rocket-taro-server
cargo build --release
if errorlevel 1 (
    echo Rocket server build failed!
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.
echo To start the integrated server:
echo   ..\scripts\start-rocket.bat
pause