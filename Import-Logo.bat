@echo off
echo Opening the logo folder...
explorer "c:\website\ALIET-ATTENDANCE\public"
echo.
echo ========================================================
echo INSTRUCTIONS:
echo 1. Drag and drop your ALIET logo image into this folder.
echo 2. Rename it to "logo.png" (replace the existing file).
echo 3. Press any key here once you are done.
echo ========================================================
pause
echo Refreshing browser cache...
del "c:\website\ALIET-ATTENDANCE\.next\cache\images\*" /s /q >nul 2>&1
echo Done! Please refresh your browser (Ctrl+F5).
pause
