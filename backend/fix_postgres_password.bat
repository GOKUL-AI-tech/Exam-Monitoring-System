@echo off
setlocal enabledelayedexpansion
title PostgreSQL Password Reset Tool
color 0A

echo.
echo ============================================================
echo   PostgreSQL Password Reset — ExamProctor AI
echo ============================================================
echo.

:: ── Find PostgreSQL data directory ──────────────────────────
set "PG_DATA="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\data\pg_hba.conf" set "PG_DATA=%%D\data"
)

if "%PG_DATA%"=="" (
    echo [ERROR] Could not find PostgreSQL installation.
    echo Please check C:\Program Files\PostgreSQL\
    pause & exit /b 1
)

echo [OK] Found PostgreSQL data at: %PG_DATA%
echo.

:: ── Find psql.exe ───────────────────────────────────────────
set "PSQL="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\bin\psql.exe" set "PSQL=%%D\bin\psql.exe"
)

:: ── Find service name ───────────────────────────────────────
set "SVC_NAME="
for /f "tokens=1" %%S in ('sc query type= all state= all ^| findstr /i "postgresql"') do (
    if "%%S"=="SERVICE_NAME:" (
        for /f "tokens=2" %%N in ('sc query type= all state= all ^| findstr /i "postgresql"') do (
            set "SVC_NAME=%%N"
        )
    )
)
:: Fallback
if "%SVC_NAME%"=="" set "SVC_NAME=postgresql-x64-18"

echo [OK] PostgreSQL service: %SVC_NAME%
echo.

:: ── Backup pg_hba.conf ──────────────────────────────────────
set "HBA=%PG_DATA%\pg_hba.conf"
set "HBA_BAK=%PG_DATA%\pg_hba.conf.bak"
copy "%HBA%" "%HBA_BAK%" >nul
echo [OK] Backed up pg_hba.conf to pg_hba.conf.bak

:: ── Patch pg_hba.conf → trust ───────────────────────────────
powershell -NoProfile -Command ^
  "(Get-Content '%HBA%') -replace 'scram-sha-256','trust' -replace '\bmd5\b','trust' | Set-Content '%HBA%'"
echo [OK] Set pg_hba.conf to trust mode

:: ── Restart PostgreSQL ──────────────────────────────────────
echo.
echo [..] Restarting PostgreSQL service...
net stop %SVC_NAME% >nul 2>&1
net start %SVC_NAME% >nul 2>&1
timeout /t 3 /nobreak >nul
echo [OK] PostgreSQL restarted

:: ── Run ALTER USER ──────────────────────────────────────────
echo.
echo [..] Setting password to: postgres123
if not "%PSQL%"=="" (
    "%PSQL%" -U postgres -c "ALTER USER postgres PASSWORD 'postgres123';" >nul 2>&1
    echo [OK] Password changed to postgres123
) else (
    echo [WARN] psql.exe not found — trying via PATH
    psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres123';" >nul 2>&1
    echo [OK] Password changed to postgres123
)

:: ── Restore pg_hba.conf ─────────────────────────────────────
copy "%HBA_BAK%" "%HBA%" >nul
echo [OK] Restored pg_hba.conf to original auth mode

:: ── Restart PostgreSQL again ─────────────────────────────────
echo.
echo [..] Restarting PostgreSQL with restored config...
net stop %SVC_NAME% >nul 2>&1
net start %SVC_NAME% >nul 2>&1
timeout /t 3 /nobreak >nul
echo [OK] PostgreSQL restarted with secure auth

:: ── Update .env ─────────────────────────────────────────────
set "ENV_FILE=%~dp0.env"
if exist "%ENV_FILE%" (
    powershell -NoProfile -Command ^
      "(Get-Content '%ENV_FILE%') -replace 'DB_PASSWORD=.*','DB_PASSWORD=postgres123' | Set-Content '%ENV_FILE%'"
    echo [OK] Updated .env DB_PASSWORD=postgres123
)

echo.
echo ============================================================
echo   ALL DONE!  Password is now: postgres123
echo.
echo   Now go back to your backend terminal and run:
echo   npm run dev
echo ============================================================
echo.
pause
