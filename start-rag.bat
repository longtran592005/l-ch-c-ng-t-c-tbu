@echo off
title TBU RAG Chatbot Service (HTTPS)
cd /d "%~dp0python_service"
echo Starting RAG Service on https://localhost:8002
echo Press Ctrl+C to stop
echo.
python rag_service.py --no-reload
pause
