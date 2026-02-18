@echo off
cd /d %~dp0

echo.
echo A adicionar ficheiros...
git add .

echo.
set /p msg=Mensagem do commit: 

git commit -m "%msg%"

echo.
echo A enviar para GitHub...
git push

echo.
echo Feito!
pause
