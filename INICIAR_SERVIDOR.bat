@echo off
cd /d "%~dp0"
echo Iniciando servidor en puerto 3001 y abriendo navegador...
start "" http://localhost:3001/dj/admin
call npm run dev -- -p 3001
pause
