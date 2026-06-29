@echo off
cd /d "%~dp0"

REM ========== Edit your parameters below ==========
set BASE_URL=https://your-site.example
set VISITS=100
set VISIT_INTERVAL_MIN=2
set VISIT_INTERVAL_MAX=3
set HEADLESS=true
REM Set HEADLESS=false to show the browser window
REM ===============================================

echo.
echo monopolling
echo   BASE_URL           = %BASE_URL%
echo   VISITS             = %VISITS%
echo   VISIT_INTERVAL_MIN = %VISIT_INTERVAL_MIN%
echo   VISIT_INTERVAL_MAX = %VISIT_INTERVAL_MAX%
echo   HEADLESS           = %HEADLESS%
echo.

npm start

if errorlevel 1 (
  echo.
  echo Run failed. Make sure Node.js is installed and you ran "npm install" once.
)

echo.
pause
