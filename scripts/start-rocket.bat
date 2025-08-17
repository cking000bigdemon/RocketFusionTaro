@echo off
echo Starting Rocket Taro Server...
echo.

REM Navigate to rocket server directory
cd /d %~dp0\..\rocket-taro-server

echo Building Rocket server...
cargo build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Starting server...
echo You can access:
echo   - Frontend: http://localhost:8000
echo   - API Health: http://localhost:8000/api/health
echo   - API User: http://localhost:8000/api/user
echo.

cargo run
pause