@echo off
setlocal enabledelayedexpansion

REM GameInfoFetching Setup Script for Windows
REM This script automates the setup process for the GameInfoFetching project

echo 🎮 GameInfoFetching Setup Script
echo =================================

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [ERROR] This script should not be run as administrator
    pause
    exit /b 1
)

REM Check prerequisites
echo [INFO] Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18.0.0 or higher.
    echo [INFO] Visit: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% LSS 18 (
    echo [ERROR] Node.js version 18.0.0 or higher is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo [SUCCESS] Node.js 
node --version
echo  is installed

REM Check npm
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [SUCCESS] npm 
npm --version
echo  is installed

REM Check PostgreSQL
psql --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] PostgreSQL is not installed or not in PATH
    echo [INFO] Please install PostgreSQL manually:
    echo [INFO]   Download from https://www.postgresql.org/download/windows/
    echo [INFO] After installation, run this script again.
    pause
    exit /b 1
)

echo [SUCCESS] PostgreSQL is installed

REM Check if PostgreSQL is running
pg_isready >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PostgreSQL is not running. Please start PostgreSQL service.
    echo [INFO] You can start it from Windows Services or pgAdmin.
    pause
    exit /b 1
)

echo [SUCCESS] PostgreSQL is running

REM Setup database
echo [INFO] Setting up database...

REM Check if database exists
psql -lqt | findstr "retail_demo" >nul
if %errorLevel% == 0 (
    echo [WARNING] Database 'retail_demo' already exists
    set /p RECREATE="Do you want to recreate it? (y/N): "
    if /i "!RECREATE!"=="y" (
        echo [INFO] Dropping existing database...
        dropdb retail_demo 2>nul
    ) else (
        echo [INFO] Using existing database
    )
)

REM Create database if it doesn't exist
psql -lqt | findstr "retail_demo" >nul
if %errorLevel% neq 0 (
    echo [INFO] Creating database 'retail_demo'...
    createdb retail_demo
    echo [SUCCESS] Database created successfully
)

REM Run schema
echo [INFO] Running database schema...
if exist "backend\schema.sql" (
    psql -d retail_demo -f backend\schema.sql
    echo [SUCCESS] Database schema applied successfully
) else (
    echo [ERROR] Schema file not found at backend\schema.sql
    pause
    exit /b 1
)

REM Setup backend
echo [INFO] Setting up backend...

cd backend

REM Install dependencies
echo [INFO] Installing Node.js dependencies...
call npm install
echo [SUCCESS] Dependencies installed

REM Setup environment file
if not exist ".env" (
    echo [INFO] Creating .env file from template...
    copy env.example .env
    echo [WARNING] Please edit backend\.env with your configuration:
    echo [INFO]   - SESSION_GUID: Your API session GUID
    echo [INFO]   - OPERATOR_GUID: Your API operator GUID
    echo [INFO]   - Other settings as needed
) else (
    echo [SUCCESS] .env file already exists
)

cd ..

REM Setup frontend
echo [INFO] Setting up frontend...
cd frontend

REM Check if frontend files exist
if not exist "index.html" (
    echo [ERROR] Frontend files are missing
    pause
    exit /b 1
)
if not exist "app.js" (
    echo [ERROR] Frontend files are missing
    pause
    exit /b 1
)
if not exist "styles.css" (
    echo [ERROR] Frontend files are missing
    pause
    exit /b 1
)

echo [SUCCESS] Frontend files found

cd ..

REM Create startup script
echo [INFO] Creating startup script...
(
echo @echo off
echo.
echo REM GameInfoFetching Startup Script
echo.
echo echo 🎮 Starting GameInfoFetching...
echo.
echo REM Check if backend is already running
echo tasklist /FI "IMAGENAME eq node.exe" 2^>NUL ^| find /I /N "node.exe"^>NUL
echo if "%%errorlevel%%"=="0" ^(
echo     echo Backend is already running
echo ^) else ^(
echo     echo Starting backend server...
echo     cd backend
echo     start /B npm start
echo     cd ..
echo     timeout /t 3 /nobreak ^>nul
echo ^)
echo.
echo REM Check if backend is responding
echo curl -s http://localhost:4000/healthz ^>nul 2^>^&1
echo if %%errorlevel%% == 0 ^(
echo     echo ✅ Backend is running on http://localhost:4000
echo     echo 🌐 Open frontend\index.html in your browser
echo     echo 📊 Health check: http://localhost:4000/healthz
echo     echo 🧪 Test connections: http://localhost:4000/test
echo ^) else ^(
echo     echo ❌ Backend failed to start
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo.
echo echo Press any key to stop
echo pause
) > start.bat

echo [SUCCESS] Startup script created: start.bat

REM Create stop script
echo [INFO] Creating stop script...
(
echo @echo off
echo.
echo REM GameInfoFetching Stop Script
echo.
echo echo 🛑 Stopping GameInfoFetching...
echo.
echo REM Stop backend processes
echo taskkill /F /IM node.exe 2^>nul
echo.
echo echo ✅ GameInfoFetching stopped
echo pause
) > stop.bat

echo [SUCCESS] Stop script created: stop.bat

REM Final instructions
echo.
echo 🎉 Setup completed successfully!
echo =================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your API credentials:
echo    - SESSION_GUID
echo    - OPERATOR_GUID
echo    - Other settings as needed
echo.
echo 2. Configure games in backend\config\games.json:
echo    - Set ENABLED: true for games you want to sync
echo.
echo 3. Start the application:
echo    start.bat
echo.
echo 4. Access the frontend:
echo    Open frontend\index.html in your browser
echo.
echo 5. Stop the application:
echo    stop.bat
echo.
echo 📚 For more information, see README.md
echo.
echo [SUCCESS] Setup completed! 🎮
pause
