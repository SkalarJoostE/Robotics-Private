@echo off
rem ============================================================
rem  Robotics-AI Rollout documents - one-click builder
rem
rem  Double-click this file to regenerate every Word document in
rem  the Rollout folder from its Markdown source.
rem
rem  The .md files are the source of truth - edit those, then run
rem  this. The .docx files are overwritten every time, so never
rem  edit a .docx directly.
rem
rem  Needs Node.js (https://nodejs.org). The first run downloads
rem  the "docx" package into node_modules and takes a few seconds
rem  longer; later runs are instant.
rem ============================================================
setlocal
chcp 65001 >nul 2>&1
pushd "%~dp0"

echo.
echo  Robotics-AI - building the Rollout documents
echo  ============================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo  Node.js was not found on this PC.
    echo.
    echo  Install it from https://nodejs.org ^(the LTS version^), close this
    echo  window, then double-click this file again.
    goto :fail
)

if not exist "node_modules\" (
    echo  First run - downloading the docx package...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  The download failed. If you are on the company network this is
        echo  usually a proxy or connection problem - try again, or run
        echo  "npm install" in this folder from a terminal to see why.
        goto :fail
    )
    echo.
)

echo  Usage plans and test protocol:
call npm run build --silent
if errorlevel 1 goto :fail

echo.
echo  Capability overview:
call npm run build-capability --silent
if errorlevel 1 goto :fail

echo.
echo  ============================================
echo  Done. The .docx files in this folder are up to date.
echo.
popd
pause
exit /b 0

:fail
echo.
echo  ============================================
echo  FAILED - nothing was written. See the message above.
echo.
popd
pause
exit /b 1
