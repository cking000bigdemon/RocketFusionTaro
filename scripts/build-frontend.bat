@echo off
echo Building Rocket Frontend...
echo.

REM Set PATH to include Node.js and npm
echo Setting up environment...
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

REM Navigate to frontend directory
cd /d %~dp0\..\frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Building for production...
echo.

call npm run build:h5

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Output files are in: frontend\dist
pause