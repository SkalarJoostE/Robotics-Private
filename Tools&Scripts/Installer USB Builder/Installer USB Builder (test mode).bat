@echo off
rem ============================================================
rem  Installer USB Builder - TEST MODE launcher
rem
rem  Same window, but nothing is ever written to a USB stick:
rem  the order is looked up, the software exported and zipped,
rem  the core and plugin checked, and the USB content assembled
rem  in a temporary folder - then the write steps are skipped.
rem ============================================================
setlocal
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0InstallerUsbBuilder.ps1" -WhatIf
if errorlevel 1 (
    echo.
    echo The tool stopped with an error - see above.
    pause
)
