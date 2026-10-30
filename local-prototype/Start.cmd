@echo off
cd /d "%~dp0"
set "receipt_python=C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1020-978-0_26.1020.978.0_x64__3k8sg7r9htsxt\dependencies\python\python.exe"
if exist "%receipt_python%" (
  "%receipt_python%" -B server.py
) else (
  py -3 -B server.py
)
pause
