@echo off
echo Starting Development Servers for All Frontend Applications...
echo.

REM Set PATH to include Node.js and npm
set PATH=C:\Program Files\nodejs;C:\Users\ck091\AppData\Roaming\npm;%PATH%

echo Starting Mobile H5 development server...
start "Mobile H5 Dev" cmd /k "cd /d %~dp0\..\frontend-new\mobile\h5 && echo Mobile H5 Dev Server && echo URL: http://localhost:3000 && npm run dev"

echo Waiting 3 seconds before starting next server...
timeout /t 3 >nul

echo Starting PC Admin development server...
start "Admin Panel Dev" cmd /k "cd /d %~dp0\..\frontend-new\admin && echo PC Admin Dev Server && echo URL: http://localhost:3001 && npm run dev"

echo Waiting 2 seconds before starting backend...
timeout /t 2 >nul

echo Starting Rocket backend server...
start "Rocket Server" cmd /k "cd /d %~dp0\..\rocket-taro-server && echo Rocket Backend Server && echo URL: http://localhost:8000 && cargo run"

echo.
echo All development servers are starting...
echo.
echo URLs:
echo   Mobile H5:    http://localhost:3000
echo   PC Admin:     http://localhost:3001  
echo   Backend API:  http://localhost:8000
echo.
echo WeChat Mini Program:
echo   Open WeChat Developer Tools
echo   Import project: %~dp0\..\frontend-new\mobile\mini-program
echo.
echo Press any key to exit (this will NOT stop the servers)
pause