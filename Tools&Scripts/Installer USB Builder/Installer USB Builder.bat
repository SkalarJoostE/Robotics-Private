@echo off
rem ============================================================
rem  Installer USB Builder - launcher
rem
rem  Double-click it: the window opens. This console window
rem  stays behind it and closes with the tool.
rem
rem  To try it without writing anything to a USB stick, use
rem  "Installer USB Builder (test mode).bat" instead.
rem ============================================================
setlocal
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0InstallerUsbBuilder.ps1"
if errorlevel 1 (
    echo.
    echo The tool stopped with an error - see above.
    pause
)
