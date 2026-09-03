@echo off
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

color 0A
cls

echo ======================================================
echo   MGL PRO AUDIO - Preparar deploy a Vercel
echo ======================================================
echo.

echo Este asistente te pedira la informacion basica.
echo Si no sabes alguna respuesta, dejala vacia y lo haras despues.
echo.

set /p REPO_URL="URL del repositorio de GitHub (ej: https://github.com/tu-usuario/tu-repo.git): "
set /p PROJECT_NAME="Nombre del proyecto en Vercel (opcional): "
set /p SUPABASE_URL="NEXT_PUBLIC_SUPABASE_URL: "
set /p SUPABASE_ANON_KEY="NEXT_PUBLIC_SUPABASE_ANON_KEY: "
set /p YOUTUBE_API_KEY="NEXT_PUBLIC_YOUTUBE_API_KEY (opcional): "
set /p YOUTUBE_API_KEY_2="YOUTUBE_API_KEY (opcional): "

if not "%SUPABASE_URL%"=="" if not "%SUPABASE_ANON_KEY%"=="" (
    echo.
    echo Generando archivo .env.production.local ...
    > .env.production.local (
        echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
        if not "%YOUTUBE_API_KEY%"=="" echo NEXT_PUBLIC_YOUTUBE_API_KEY=%YOUTUBE_API_KEY%
        if not "%YOUTUBE_API_KEY_2%"=="" echo YOUTUBE_API_KEY=%YOUTUBE_API_KEY_2%
    )
    echo Archivo generado: .env.production.local
)

echo.
echo --- Variables que tendras que poner en Vercel ---
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo NEXT_PUBLIC_YOUTUBE_API_KEY=%YOUTUBE_API_KEY%
echo YOUTUBE_API_KEY=%YOUTUBE_API_KEY_2%
echo.

set /p PUSH_NOW="Quieres hacer git add / commit / push ahora? (S/N): "
if /I "%PUSH_NOW%"=="S" (
    echo.
    echo Inicializando repo y subiendo a GitHub...
    git init
    git add .
    git commit -m "Deploy Vercel" 2>nul
    git branch -M main
    if not "%REPO_URL%"=="" (
        git remote remove origin 2>nul
        git remote add origin "%REPO_URL%"
        echo Subiendo a GitHub...
        git push -u origin main
    ) else (
        echo No hay URL de repositorio. Solo queda preparado localmente.
    )
)

set /p VERCEL_CLI="Quieres desplegar con Vercel CLI? (S/N): "
if /I "%VERCEL_CLI%"=="S" (
    echo.
    echo Instala Vercel CLI si hace falta:
    echo npm i -g vercel
    echo.
    echo Luego ejecuta estas instrucciones:
    echo vercel login
    echo vercel --prod
    echo.
    echo Si ya tienes Vercel CLI instalado, puedes correrlo ahora.
    if exist "%ProgramFiles%\nodejs\node.exe" (
        echo.
        set /p RUN_NOW="Quieres ejecutarlo ahora? (S/N): "
        if /I "%RUN_NOW%"=="S" (
            vercel --prod
        )
    )
)

echo.
echo ======================================================
echo   Resumen final
echo ======================================================
echo - Si no hiciste push, hazlo despues desde GitHub.
echo - Entra a Vercel y crea el proyecto desde tu repo.
echo - Copia estas variables de entorno en Vercel.
echo - Despues haz Deploy.
echo.
echo Si quieres, tambien puedes hacerlo manualmente desde:
echo https://vercel.com/new
echo.
pause
