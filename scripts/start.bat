@echo off
echo ========================================
echo   Git ^& Claude Code Interactive Tutorial
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo.

REM Check if in project directory
if not exist "package.json" (
    echo [ERROR] Please run this script in the project root directory
    pause
    exit /b 1
)

echo Installing dependencies...
echo ========================================
call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting development server...
echo ========================================
echo.
echo Application will be available at:
echo   - Local: http://localhost:5173/
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start development server
call npm run dev