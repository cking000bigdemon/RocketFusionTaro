@echo off
echo Building PC Admin Panel...
echo.

REM Set PATH to include Node.js and npm
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

REM Navigate to Admin directory
cd /d %~dp0\..\frontend-new\admin

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing Admin dependencies...
    call npm install
    if errorlevel 1 (
        echo Admin dependencies installation failed!
        pause
        exit /b 1
    )
)

echo.
echo Building Admin for production...
call npm run build

if errorlevel 1 (
    echo Admin build failed!
    pause
    exit /b 1
)

echo.
echo PC Admin Panel build completed successfully!
echo Output: rocket-taro-server\frontend-new\admin\
echo.
echo To start development server: npm run dev
pause