@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo ===============================================
echo   Altin Portfoy Programi Baslatiliyor...
echo ===============================================
echo.
echo Lutfen biraz bekleyin, sistem hazirlaniyor.
echo "ready" yazisini gordugunuzde tarayicinizdan:
echo http://localhost:3000
echo adresine gidin.
echo.
call npm run dev
pause
