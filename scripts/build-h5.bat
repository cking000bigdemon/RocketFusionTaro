@echo off
echo Building Mobile H5 Application...
echo.

REM Set PATH to include Node.js and npm
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

REM Navigate to H5 directory
cd /d %~dp0\..\frontend-new\mobile\h5

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing H5 dependencies...
    call npm install
    if errorlevel 1 (
        echo H5 dependencies installation failed!
        pause
        exit /b 1
    )
)

echo.
echo Building H5 for production...
call npm run build

if errorlevel 1 (
    echo H5 build failed!
    pause
    exit /b 1
)

echo.
echo Mobile H5 build completed successfully!
echo Output: rocket-taro-server\frontend-new\mobile\h5\
echo.
echo To start development server: npm run dev
pause