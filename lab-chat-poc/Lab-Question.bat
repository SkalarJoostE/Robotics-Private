@echo off
setlocal
title Skalar Lab Question
cd /d "%~dp0"

REM Use the venv python if present; otherwise system python (CLI engine needs no packages).
set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

echo ============================================
echo   Skalar Lab Question - one-shot triage
echo   (For follow-up questions use Lab-Chat.bat)
echo ============================================
echo.

REM A .glf dragged onto this file arrives as the first argument.
set "LOG=%~1"

set /p ORDER=Order number (99xxxxxx):
if not defined ORDER goto :noorder

if defined LOG goto :haslog
echo.
echo Log file: drag the .glf into this window, or paste its full path.
echo (Leave blank for a configuration-only question.)
set /p LOG=Log path:
:haslog
REM strip any surrounding quotes a drag-and-drop adds
set "LOG=%LOG:"=%"

echo.
set /p SYMPTOM=Short description of the issue:

echo.
echo Running triage - this can take a few minutes...
echo.
"%PY%" "%~dp0lab_triage_cli.py" "%ORDER%" "%LOG%" "%SYMPTOM%"

echo.
echo ============================================
echo Done. The API-equivalent cost was logged to cost_log.csv.
echo Double-click Cost-Report.bat to see monthly totals.
echo ============================================
pause
exit /b

:noorder
echo No order number entered. Exiting.
pause
exit /b 1
