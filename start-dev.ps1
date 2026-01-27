# TBU Development Script
# Chạy tất cả services: Frontend + Backend + RAG

Write-Host "Starting TBU Development Environment..." -ForegroundColor Cyan

# Kill old processes
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start RAG Service in new window (with HTTPS)
Write-Host "Starting RAG Service (HTTPS port 8002)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "title RAG Service (HTTPS) && cd /d `"$scriptDir\python_service`" && python rag_service.py --no-reload" -WindowStyle Normal

# Start TTS Voice Service in new window
Write-Host "Starting TTS Voice Service (port 8003)..." -ForegroundColor Magenta
Start-Process -FilePath "cmd" -ArgumentList "/c", "title TBU Voice AI && cd /d `"$scriptDir\python_tts_service`" && .\venv\Scripts\activate && python main.py" -WindowStyle Normal

# Wait for services to initialize
Write-Host "Waiting for Services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend + Backend
Write-Host "Starting Frontend + Backend..." -ForegroundColor Green
Set-Location $scriptDir
npm run dev:no-rag
