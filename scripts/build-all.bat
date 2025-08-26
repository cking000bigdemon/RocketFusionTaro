@echo off
echo Building Rocket Multi-Frontend Integration...
echo.

REM Build all frontend applications
echo 1. Building Frontend Applications...

REM Build Mobile H5 Application
echo   1.1 Building Mobile H5 (Vue3 + Vant)...
cd /d %~dp0\..\frontend-new\mobile\h5
if not exist "node_modules" (
    echo     Installing H5 dependencies...
    call npm install
    if errorlevel 1 (
        echo H5 dependencies installation failed!
        pause
        exit /b 1
    )
)

echo     Building H5 for production...
call npm run build
if errorlevel 1 (
    echo H5 build failed!
    pause
    exit /b 1
)

REM Build PC Admin Panel
echo   1.2 Building PC Admin Panel (Vue3 + Element Plus)...
cd /d %~dp0\..\frontend-new\admin
if not exist "node_modules" (
    echo     Installing Admin dependencies...
    call npm install
    if errorlevel 1 (
        echo Admin dependencies installation failed!
        pause
        exit /b 1
    )
)

echo     Building Admin panel for production...
call npm run build
if errorlevel 1 (
    echo Admin build failed!
    pause
    exit /b 1
)

REM WeChat Mini Program (manual build required)
echo   1.3 WeChat Mini Program...
echo     Note: Please use WeChat Developer Tools to build the mini-program
echo     Location: frontend-new\mobile\mini-program\

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
echo Built applications:
echo   - Mobile H5: rocket-taro-server\frontend-new\mobile\h5\
echo   - PC Admin: rocket-taro-server\frontend-new\admin\
echo   - Mini Program: frontend-new\mobile\mini-program\ (manual build required)
echo.
echo To start the integrated server:
echo   ..\scripts\start-rocket.bat
pause