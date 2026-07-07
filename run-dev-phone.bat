@echo off
setlocal
cd /d "%~dp0"

set "NODE_DIR=%~dp0..\tools\node\node-v22.13.0-win-x64"
if not exist "%NODE_DIR%\node.exe" (
  echo Portable Node not found at %NODE_DIR%
  exit /b 1
)
set "PATH=%NODE_DIR%;%PATH%"

set "DATABASE_URL=file:./dev.db"

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr "192.168."') do (
  set "LAN_IP=%%a"
  goto :found_ip
)
:found_ip
set "LAN_IP=%LAN_IP: =%"

echo.
echo ============================================
echo  Woof ID - iPhone met HTTPS (camera/QR)
echo ============================================
echo.
if defined LAN_IP (
  echo  Op je iPhone in Safari:
  echo    https://%LAN_IP%:3000
  echo.
  echo  Bij certificaat-waarschuwing: Geavanceerd - Doorgaan
  echo.
  echo  Zet in .env:
  echo    NEXTAUTH_URL=https://%LAN_IP%:3000
  echo.
) else (
  echo  Kon geen wifi-IP vinden.
  echo.
)

call npm run prisma:generate
if errorlevel 1 exit /b 1

call npm run dev:https
