@echo off
echo Clearing Windows Icon Cache...
echo.

REM Stop Windows Explorer
taskkill /f /im explorer.exe

REM Delete icon cache files
cd /d "%userprofile%\AppData\Local\Microsoft\Windows\Explorer"
attrib -h iconcache_*.db
del iconcache_*.db /a

REM Restart Windows Explorer
start explorer.exe

echo.
echo Icon cache cleared! Please restart your computer for full effect.
pause
