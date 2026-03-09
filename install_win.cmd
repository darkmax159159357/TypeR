@echo off
:: Set working directory to the location of this script
cd /d "%~dp0"

:: Launch the PowerShell installer, bypassing execution policy
PowerShell -NoProfile -ExecutionPolicy Bypass -File "install.ps1"
