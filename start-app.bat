@echo off
REM Short Video Editor - Application Starter (Local Development)
REM Starts backend and frontend without Docker

echo.
echo ========================================
echo   Short Video Editor - Starting App
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 20.19+ or 22.12+
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

echo Starting Backend...
REM Open new terminal for backend
start cmd /k "cd backend && python -m venv venv & venv\Scripts\activate.bat & pip install -q -r requirements.txt & uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit for backend to start
timeout /t 3 /nobreak

echo Starting Frontend...
REM Open new terminal for frontend
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ========================================
echo   Services Starting...
echo ========================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:8000
echo.
echo Check the opened terminals for startup logs.
echo Close terminals to stop services.
echo.
pause
