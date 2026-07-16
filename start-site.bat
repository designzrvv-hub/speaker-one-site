@echo off
setlocal
cd /d "%~dp0"
npm config set registry https://registry.npmjs.org/
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto error
)
call npm run dev
exit /b 0
:error
echo.
echo Installation failed. Run repair-npm-and-start.bat.
pause
exit /b 1
