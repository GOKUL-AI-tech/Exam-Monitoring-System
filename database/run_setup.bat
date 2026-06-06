@echo off
title Database Setup - ExamProctor AI
color 0A

echo.
echo  ================================================
echo    ExamProctor AI - Database Setup
echo  ================================================
echo.

:: Ask for credentials
set /p PGUSER=Enter PostgreSQL username (default: postgres):
if "%PGUSER%"=="" set PGUSER=postgres

set /p PGPASSWORD=Enter PostgreSQL password:
set /p PGHOST=Enter host (default: localhost):
if "%PGHOST%"=="" set PGHOST=localhost

set /p PGPORT=Enter port (default: 5432):
if "%PGPORT%"=="" set PGPORT=5432

set /p DBNAME=Enter database name (default: exam_proctoring):
if "%DBNAME%"=="" set DBNAME=exam_proctoring

echo.
echo  Creating database "%DBNAME%"...
set PGPASSWORD=%PGPASSWORD%
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -c "CREATE DATABASE %DBNAME%;" 2>nul
if %errorlevel% equ 0 (
    echo  [OK] Database created.
) else (
    echo  [INFO] Database may already exist, continuing...
)

echo.
echo  Running setup_complete.sql ...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %DBNAME% -f "%~dp0setup_complete.sql"

if %errorlevel% equ 0 (
    echo.
    echo  ================================================
    echo   SUCCESS! Database is ready.
    echo  ================================================
    echo.
    echo   You can now start the backend: npm run dev
    echo.
) else (
    echo.
    echo  [ERROR] Setup failed. Check the output above.
    echo.
)
pause
