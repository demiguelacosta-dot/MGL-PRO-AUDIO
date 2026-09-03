@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title MGL PRO AUDIO - Deploy Vercel
color 0A
cls

echo ================================================
echo       MGL PRO AUDIO - SUBIR A VERCEL
echo ================================================
echo.

echo Este proceso subira el proyecto actual a Vercel.
echo.

where node >nul 2>&1 || goto :no_node
where npx >nul 2>&1 || goto :no_node

set /p VERCEL_TOKEN="Pega tu token de Vercel (no se guardara): "
if not defined VERCEL_TOKEN goto :no_token

echo.
echo Comprobando el proyecto...
call npm run build
if errorlevel 1 goto :build_error

echo.
echo Abriendo el asistente de Vercel...
echo Responde las preguntas con Enter para aceptar las opciones recomendadas.
echo.
call npx vercel --prod --token "!VERCEL_TOKEN!"
if errorlevel 1 goto :deploy_error

echo.
echo ================================================
echo       DEPLOY TERMINADO CORRECTAMENTE
echo ================================================
echo La URL de tu web aparecio en las lineas anteriores.
pause
exit /b 0

:no_node
echo ERROR: instala Node.js LTS desde https://nodejs.org/
pause
exit /b 1

:no_token
echo ERROR: debes introducir el token de Vercel.
pause
exit /b 1

:build_error
echo ERROR: el proyecto no supera el build de produccion.
echo Corrige el error antes de desplegar.
pause
exit /b 1

:deploy_error
echo ERROR: Vercel no pudo completar el despliegue.
echo Comprueba el token y los permisos de tu cuenta.
pause
exit /b 1
