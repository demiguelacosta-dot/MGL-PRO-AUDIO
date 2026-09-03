@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
color 0A
cls
echo ======================================================
echo   MGL PRO AUDIO - Deploy automatico a Vercel
echo ======================================================
echo.
where node >nul 2>&1 || goto :missing_node
where npm >nul 2>&1 || goto :missing_node
where git >nul 2>&1 || goto :missing_git

echo [1/5] Datos del proyecto
set /p REPO_URL="URL del repositorio GitHub (vacio para no subir): "
set /p SUPABASE_URL="NEXT_PUBLIC_SUPABASE_URL: "
set /p SUPABASE_ANON_KEY="NEXT_PUBLIC_SUPABASE_ANON_KEY: "
set /p YOUTUBE_API_KEY="NEXT_PUBLIC_YOUTUBE_API_KEY (opcional): "
set /p YOUTUBE_API_KEY_2="YOUTUBE_API_KEY (opcional): "
if "%SUPABASE_URL%"=="" goto :missing_env
if "%SUPABASE_ANON_KEY%"=="" goto :missing_env

echo.
echo [2/5] Protegiendo archivos privados y generando entorno local
> .env.production.local echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
>> .env.production.local echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
if not "%YOUTUBE_API_KEY%"=="" >> .env.production.local echo NEXT_PUBLIC_YOUTUBE_API_KEY=%YOUTUBE_API_KEY%
if not "%YOUTUBE_API_KEY_2%"=="" >> .env.production.local echo YOUTUBE_API_KEY=%YOUTUBE_API_KEY_2%

echo.
echo [3/5] Comprobando build de produccion
call npm run build
if errorlevel 1 goto :build_failed

echo.
echo [4/5] Preparando GitHub
git init
git branch -M main
if not "%REPO_URL%"=="" (
  git remote get-url origin >nul 2>&1
  if errorlevel 1 git remote add origin "%REPO_URL%"
  if not errorlevel 1 git remote set-url origin "%REPO_URL%"
  for /f "delims=" %%A in ('git config user.name 2^>nul') do set "GIT_NAME=%%A"
  if not defined GIT_NAME set /p GIT_NAME="Nombre para el commit (ej: MGL PRO AUDIO): "
  if defined GIT_NAME git config user.name "!GIT_NAME!"
  for /f "delims=" %%A in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%A"
  if not defined GIT_EMAIL set /p GIT_EMAIL="Email para el commit (ej: tu-email@ejemplo.com): "
  if defined GIT_EMAIL git config user.email "!GIT_EMAIL!"
  git config user.name >nul 2>&1 || goto :missing_git_identity
  git config user.email >nul 2>&1 || goto :missing_git_identity
  git add .
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "Deploy MGL Pro Audio"
    if errorlevel 1 goto :commit_failed
  ) else (
    echo No hay cambios nuevos para crear commit.
  )
  git fetch origin
  git merge origin/main --allow-unrelated-histories -m "Integrate GitHub history"
  if errorlevel 1 goto :merge_failed
  git push -u origin main
  if errorlevel 1 goto :push_failed
) else (
  echo Repo vacio: se omite el push.
)

echo.
echo [5/5] Abriendo Vercel
start "" "https://vercel.com/new"
echo Proyecto preparado. Agrega las variables de entorno en Vercel.
pause
exit /b 0

:missing_node
echo ERROR: instala Node.js LTS desde https://nodejs.org/
pause
exit /b 1
:missing_git
echo ERROR: instala Git desde https://git-scm.com/download/win
pause
exit /b 1
:missing_env
echo ERROR: Supabase URL y anon key son obligatorias.
pause
exit /b 1
:missing_git_identity
echo ERROR: necesitas indicar nombre y email para crear el commit.
pause
exit /b 1
:commit_failed
echo ERROR: no se pudo crear el commit. Revisa el mensaje anterior.
pause
exit /b 1
:merge_failed
echo ERROR: no se pudo integrar el historial existente de GitHub.
pause
exit /b 1
:build_failed
echo ERROR: el build fallo. Corrige el error antes de subir a Vercel.
pause
exit /b 1
:push_failed
echo ERROR: no se pudo hacer push. Revisa la URL, permisos o login de GitHub.
pause
exit /b 1
