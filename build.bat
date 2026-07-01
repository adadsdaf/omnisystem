@echo off
chcp 65001 >nul
echo Building Desktop Application...
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm...
    npm install -g pnpm
)

echo [1/5] Installing packages...
call pnpm install
if errorlevel 1 (
    echo [ERROR] Failed to install packages
    pause
    exit /b 1
)

echo.
echo [2/5] Building API server...
call pnpm --filter @workspace/api-server run build
if errorlevel 1 (
    echo [ERROR] Failed to build API server
    pause
    exit /b 1
)

echo.
echo [3/5] Building Frontend...
set PORT=8080
set BASE_PATH=/
call pnpm --filter @workspace/pos-system run build
if errorlevel 1 (
    echo [ERROR] Failed to build Frontend
    pause
    exit /b 1
)

echo.
echo [4/5] Building desktop app...
call node scripts/build-desktop.mjs
if errorlevel 1 (
    echo [ERROR] Failed to build desktop app
    pause
    exit /b 1
)

echo.
echo [5/5] Building Electron app...
cd electron-app
call pnpm install
call pnpm run build:app
if errorlevel 1 (
    echo [ERROR] Failed to build Electron app
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo    Build completed successfully!
echo    Setup file in: electron-app\release\
echo ============================================
echo.
pause