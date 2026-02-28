#!/bin/bash
# TBU Development Script (Linux)
# Chạy tất cả services: Frontend + Backend + RAG

echo -e "\033[36mStarting TBU Development Environment...\033[0m"

# Kill old processes
echo -e "\033[33mCleaning up old processes...\033[0m"
pkill -f "python rag_service.py" 2>/dev/null
pkill -f "python main.py" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Start RAG Service in background
echo -e "\033[33mStarting RAG Service (port 8002)...\033[0m"
cd "$PROJECT_ROOT/python_service" && python rag_service.py --no-reload &

# Start TTS Voice Service in background
echo -e "\033[35mStarting TTS Voice Service (port 8003)...\033[0m"
cd "$PROJECT_ROOT/python_tts_service" && python main.py &

# Wait for services to initialize
echo -e "\033[33mWaiting for Services to start...\033[0m"
sleep 2

# Start Frontend + Backend
echo -e "\033[32mStarting Frontend + Backend...\033[0m"
cd "$PROJECT_ROOT"
npm run dev:no-rag
