@echo off
echo Building Rocket Multi-Frontend Applications...
echo.

REM Set PATH to include Node.js and npm
echo Setting up environment...
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

echo.
echo Choose build target:
echo 1. Build All (H5 + Admin)
echo 2. Build Mobile H5 Only
echo 3. Build PC Admin Only
echo 4. Build Development Mode
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto build_all
if "%choice%"=="2" goto build_h5
if "%choice%"=="3" goto build_admin
if "%choice%"=="4" goto build_dev
goto invalid_choice

:build_all
echo Building all frontend applications...
call :build_h5_app
if errorlevel 1 exit /b 1
call :build_admin_app
if errorlevel 1 exit /b 1
echo.
echo All frontend applications built successfully!
goto end

:build_h5
echo Building Mobile H5 application...
call :build_h5_app
if errorlevel 1 exit /b 1
echo.
echo Mobile H5 application built successfully!
goto end

:build_admin
echo Building PC Admin panel...
call :build_admin_app
if errorlevel 1 exit /b 1
echo.
echo PC Admin panel built successfully!
goto end

:build_dev
echo Starting development servers...
echo.
echo Starting Mobile H5 dev server...
start "Mobile H5 Dev" cmd /k "cd /d %~dp0\..\frontend-new\mobile\h5 && npm run dev"
timeout /t 2 >nul
echo.
echo Starting PC Admin dev server...
start "Admin Dev" cmd /k "cd /d %~dp0\..\frontend-new\admin && npm run dev"
echo.
echo Development servers started!
echo Mobile H5: http://localhost:3000
echo PC Admin: http://localhost:3001
goto end

:build_h5_app
echo.
echo Building Mobile H5 (Vue3 + Vant)...
cd /d %~dp0\..\frontend-new\mobile\h5
if not exist "node_modules" (
    echo Installing H5 dependencies...
    call npm install
    if errorlevel 1 (
        echo H5 dependencies installation failed!
        exit /b 1
    )
)
echo Building H5 for production...
call npm run build
if errorlevel 1 (
    echo H5 build failed!
    exit /b 1
)
echo H5 build completed: rocket-taro-server\frontend-new\mobile\h5\
exit /b 0

:build_admin_app
echo.
echo Building PC Admin Panel (Vue3 + Element Plus)...
cd /d %~dp0\..\frontend-new\admin
if not exist "node_modules" (
    echo Installing Admin dependencies...
    call npm install
    if errorlevel 1 (
        echo Admin dependencies installation failed!
        exit /b 1
    )
)
echo Building Admin for production...
call npm run build
if errorlevel 1 (
    echo Admin build failed!
    exit /b 1
)
echo Admin build completed: rocket-taro-server\frontend-new\admin\
exit /b 0

:invalid_choice
echo Invalid choice! Please run the script again and choose 1-4.
pause
exit /b 1

:end
echo.
echo Additional Notes:
echo - WeChat Mini Program: Use WeChat Developer Tools to build manually
echo - Location: frontend-new\mobile\mini-program\
echo - All built files are served by the Rocket server
pause