@echo off
setlocal
title Skalar Helpdesk Chat
cd /d "%~dp0"

REM Use the venv python if present; otherwise system python (the chat engine needs no packages).
set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

echo ==================================================
echo   Skalar Helpdesk Chat - solve an RB / ES ticket
echo ==================================================
echo.
echo Nothing is ever posted to Jira. The findings land in
echo   Service Items\^<TICKET^>\analysis.md
echo with a draft reply for you to send yourself.
echo.
echo Type 'done' when finished, 'quit' to leave without
echo writing, 'cost' for the running total.
echo.
echo VPN must be connected - the scraper needs Jira and SVN.
echo.

"%PY%" "%~dp0helpdesk_chat.py" %*

echo.
pause
exit /b
