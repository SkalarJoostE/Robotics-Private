@echo off
setlocal
title Skalar Lab - Cost Report
cd /d "%~dp0"

set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

REM Optional: pass a month like 2026-07 to filter (works when run from a terminal).
"%PY%" "%~dp0cost_report.py" %*

echo.
pause
