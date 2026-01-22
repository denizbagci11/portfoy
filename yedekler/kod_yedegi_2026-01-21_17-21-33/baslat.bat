@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo ===============================================
echo   Altin Portfoy Programi Baslatiliyor...
echo ===============================================
echo.
echo Onceki prosesler temizleniyor...
taskkill /F /IM node.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul
echo.
echo Lutfen biraz bekleyin, sistem hazirlaniyor.
echo "ready" yazisini gordugunuzde tarayicinizdan:
echo http://localhost:3000
echo adresine gidin.
echo.
call npm run dev
pause
