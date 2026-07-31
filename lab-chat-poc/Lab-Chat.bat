@echo off
setlocal
title Skalar Lab Chat
cd /d "%~dp0"

REM Use the venv python if present; otherwise system python (the chat engine needs no packages).
set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

REM A .glf dragged onto this file arrives as the first argument.
set "LOG=%~1"

echo ==================================================
echo   Skalar Lab Chat - ask about a robot, then follow up
echo ==================================================
echo.
echo Type 'done' when finished (offers to file the chat),
echo 'quit' to leave without filing, 'cost' for the running total.
echo.

if defined LOG (
    "%PY%" "%~dp0lab_chat.py" "" "%LOG%"
) else (
    "%PY%" "%~dp0lab_chat.py"
)

echo.
pause
exit /b
