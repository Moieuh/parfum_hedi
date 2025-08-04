@echo off
title Serveur Parfum (Node.js)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js n'est pas installe ou pas dans le PATH.
    echo Installez-le depuis https://nodejs.org/
    pause
    exit /b
)
echo ===============================
echo   Demarrage du serveur Parfum
echo ===============================
echo.
echo Pour arrete le serveur. Appuie sur ctrl+c puis o ou ferme simplement la fenétre.
echo.
echo Ps:Hedi franchement tu me dois au moins  1 joker pour pas sortir, c'est pas donne de faire ca !


cd /d "%~dp0"

REM Ouvre la page dans le navigateur (peut échouer si le serveur n'est pas encore prêt)
start http://localhost:3000/Login.html

REM Lance le serveur Node.js dans CETTE fenêtre
node server.js
pause >nul
