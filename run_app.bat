@echo off
title CocoMeo - He thong The Quyen Nang & Sieu Quyen Nang
echo =====================================================================
echo           HE THONG THE QUYEN NANG & SIEU QUYEN NANG COCOMEO
echo =====================================================================
echo.
echo [1/2] Dang kiem tra va khoi dong ung dung...
echo [2/2] Trinh duyet se tu dong mo tai dia chi: http://127.0.0.1:5000
echo.
echo (Nhan Ctrl+C neu muon dung server)
echo ---------------------------------------------------------------------

timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5000
python app.py
pause
