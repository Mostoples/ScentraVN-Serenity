@echo off
title SYNAWATCH Server
color 0A

echo.
echo  ====================================
echo     SYNAWATCH - Smart Health Monitor
echo  ====================================
echo.
echo  Starting local server...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python tidak ditemukan!
    echo.
    echo  Silakan install Python dari:
    echo  https://www.python.org/downloads/
    echo.
    pause
    exit /b
)

:: Open browser after 2 seconds
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8000/auth.html"

echo  Server berjalan di: http://localhost:8000
echo.
echo  Tekan Ctrl+C untuk menghentikan server
echo.
echo  ====================================
echo.

:: Start Python HTTP server
python -m http.server 8000
