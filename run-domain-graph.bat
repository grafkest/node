@echo off
setlocal
cd /d %~dp0
if not exist "release\domain-graph.exe" (
  echo [ERROR] Файл release\domain-graph.exe не найден.
  echo. 
  echo Загрузите готовый исполняемый файл из раздела Releases на GitHub и поместите его в папку release\.
  echo Либо пересоберите артефакт локально командой "npm run build:exe" (потребуются Node.js и npm).
  exit /b 1
)
start "Domain Graph" "%~dp0release\domain-graph.exe"
