@echo off
setlocal
cd /d "%~dp0"
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json
npm cache verify
call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 goto error
call npm run dev
exit /b 0
:error
echo.
echo npm installation failed. Check internet access, VPN, proxy, or antivirus filtering.
pause
exit /b 1
