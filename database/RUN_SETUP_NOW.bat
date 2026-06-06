@echo off
echo ================================================
echo  ExamProctor AI - Auto Database Setup
echo ================================================
echo.

REM Find psql.exe — check common PostgreSQL install locations
set PSQL=
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\15\bin\psql.exe"

if "%PSQL%"=="" (
  echo ERROR: psql.exe not found. Trying PATH...
  set PSQL=psql
)

echo Using: %PSQL%
echo.

REM Set password so psql doesn't prompt
set PGPASSWORD=postgres123

REM Step 1: Create the database (ignore error if already exists)
echo Step 1: Creating database exam_proctoring...
%PSQL% -U postgres -h localhost -p 5432 -c "CREATE DATABASE exam_proctoring;" 2>nul
echo    (OK if it says "already exists")
echo.

REM Step 2: Run the setup SQL inside exam_proctoring
echo Step 2: Creating tables and seeding demo data...
%PSQL% -U postgres -h localhost -p 5432 -d exam_proctoring -f "%~dp0PGADMIN_SETUP.sql"

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ================================================
  echo  SUCCESS! Database is ready.
  echo ================================================
  echo.
  echo  Login credentials:
  echo  Main Admin : admin@examproctoring.com  / Admin@123
  echo  Staff      : staff@democollege.edu     / Demo@123
  echo  Student    : student@democollege.edu   / Demo@123
  echo.
) else (
  echo.
  echo ================================================
  echo  ERROR - Setup failed. Check output above.
  echo ================================================
  echo.
  echo  Common fix: your PostgreSQL password may differ.
  echo  Open pgAdmin - Query Tool - run:
  echo    ALTER USER postgres PASSWORD 'postgres123';
  echo  Then run this .bat again.
  echo.
)

pause
