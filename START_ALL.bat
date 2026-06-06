@echo off
title ExamProctor AI - Startup
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     AI-Based Online Exam Proctoring System   ║
echo  ║              Starting All Services           ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Check Node.js ──────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit
)

:: ── Check Python ───────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install from https://python.org
    pause & exit
)

echo [1/3] Starting AI Proctoring Service (port 8000)...
start "AI Service" cmd /k "cd /d "%~dp0ai-proctoring" && python main.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend API (port 5000)...
start "Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend (port 3000)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo  ✅ All services started!
echo.
echo  URLs:
echo    Frontend   → http://localhost:3000
echo    Backend    → http://localhost:5000/api/health
echo    AI Service → http://localhost:8000/health
echo.
echo  Demo Login (Student):
echo    Email:    student@democollege.edu
echo    Password: Demo@123
echo.
pause
