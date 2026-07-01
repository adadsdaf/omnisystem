@echo off
chcp 65001 >nul
title إتقان سوفت - بناء تطبيق سطح المكتب

echo.
echo ============================================
echo    إتقان سوفت - بناء تطبيق سطح المكتب
echo ============================================
echo.

:: التحقق من وجود Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [خطأ] Node.js غير مثبت!
    echo يرجى تثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)

:: التحقق من وجود pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [تثبيت] جاري تثبيت pnpm...
    npm install -g pnpm
)

echo [1/5] جاري تثبيت الحزم...
call pnpm install
if errorlevel 1 (
    echo [خطأ] فشل تثبيت الحزم
    pause
    exit /b 1
)

echo.
echo [2/5] جاري بناء السيرفر (API)...
call pnpm --filter @workspace/api-server run build
if errorlevel 1 (
    echo [خطأ] فشل بناء السيرفر
    pause
    exit /b 1
)

echo.
echo [3/5] جاري بناء الواجهة (Frontend)...
set PORT=8080
set BASE_PATH=/
call pnpm --filter @workspace/pos-system run build
if errorlevel 1 (
    echo [خطأ] فشل بناء الواجهة
    pause
    exit /b 1
)

echo.
echo [4/5] جاري تجميع ملفات التطبيق...
call node scripts/build-desktop.mjs
if errorlevel 1 (
    echo [خطأ] فشل تجميع ملفات التطبيق
    pause
    exit /b 1
)

echo.
echo [5/5] جاري بناء ملف الإعداد (.exe)...
cd electron-app
call pnpm install
call pnpm run build:app
if errorlevel 1 (
    echo [خطأ] فشل بناء ملف الإعداد
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo    تم البناء بنجاح!
echo    ملف الإعداد موجود في:
echo    electron-app\release\
echo ============================================
echo.
pause
