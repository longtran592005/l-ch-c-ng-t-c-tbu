@echo off
setlocal
title TBU Voice AI Service (Edge-TTS)

echo =========================================================
echo    DICH VU GIONG NOI AI - TBU (Northern Vietnamese)
echo =========================================================
echo [INFO] Dang kiem tra moi truong...

cd python_tts_service

if not exist venv (
    echo [ERROR] Khong tim thay moi truong ao 'venv'.
    echo Vui long chay cac lenh sau de thiet lap:
    echo   cd python_tts_service
    echo   python -m venv venv
    echo   .\venv\Scripts\activate
    echo   pip install edge-tts fastapi uvicorn pydantic
    pause
    exit /b
)

echo [INFO] Kich hoat moi truong ao...
call venv\Scripts\activate

echo [INFO] Dang khoi dong Server Tai cong 8003...
echo [TIP]  He thong su dung giong doc Hoai My va Nam Minh (Microsoft).
echo ---------------------------------------------------------

python main.py

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Server gap loi va da dung lai.
    pause
)

endlocal
