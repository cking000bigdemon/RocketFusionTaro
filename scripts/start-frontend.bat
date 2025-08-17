@echo off
echo Starting Rocket Frontend Development Server...
echo.

REM Set PATH to include Node.js and npm
echo Setting up environment...
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

REM Navigate to frontend directory
cd /d %~dp0\..\frontend

REM Install dependencies if node_modules doesn't exist
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
echo Starting development server...
echo You can access the app at: http://localhost:10086
echo.

call npm run dev:h5

pause