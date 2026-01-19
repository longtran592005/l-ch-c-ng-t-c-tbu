"""
Configuration file for TBU Speech-to-Text Service
"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
UPLOAD_DIR = BASE_DIR / "temp_uploads"
LOGS_DIR = BASE_DIR / "logs"

# Create necessary directories
MODELS_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Model Configuration - Whisper
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "suzii/vi-whisper-large-v3-turbo-v1-ct2")
WHISPER_SIZE = os.getenv("WHISPER_SIZE", "small")  # tiny, base, small, medium, large

# Model Configuration - Qwen 2.5
QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct")
QWEN_ENABLED = os.getenv("QWEN_ENABLED", "false").lower() == "true"
QWEN_MAX_NEW_TOKENS = int(os.getenv("QWEN_MAX_NEW_TOKENS", "3072"))
QWEN_TEMPERATURE = float(os.getenv("QWEN_TEMPERATURE", "0.7"))
QWEN_TOP_P = float(os.getenv("QWEN_TOP_P", "0.9"))
QWEN_USE_QUANTIZATION = os.getenv("QWEN_USE_QUANTIZATION", "true").lower() == "true"

# Device Configuration
DEVICE = os.getenv("DEVICE", "cuda" if __import__("torch").cuda.is_available() else "cpu")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "float16" if DEVICE == "cuda" else "int8")

# Audio Configuration
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))  # 500MB
SUPPORTED_FORMATS = [".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".aac", ".mp4"]

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOGS_DIR / "speech_to_text.log"

# Transcription Configuration
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "vi")
DEFAULT_TASK = os.getenv("DEFAULT_TASK", "transcribe")  # transcribe or translate
DEFAULT_FORMAT_OUTPUT = os.getenv("DEFAULT_FORMAT_OUTPUT", "true").lower() == "true"

# Format Settings
AUTO_LINE_BREAKS = os.getenv("AUTO_LINE_BREAKS", "true").lower() == "true"
SENTENCE_ENDINGS = ['.', '!', '?', '。', '！', '？']
MAX_SENTENCE_LENGTH = int(os.getenv("MAX_SENTENCE_LENGTH", "300"))

# Performance Settings
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "1"))  # Number of concurrent transcriptions
ENABLE_BATCH_PROCESSING = os.getenv("ENABLE_BATCH_PROCESSING", "false").lower() == "true"

# Timeout Settings
UPLOAD_TIMEOUT = int(os.getenv("UPLOAD_TIMEOUT", "300"))  # 5 minutes
TRANSCRIPTION_TIMEOUT = int(os.getenv("TRANSCRIPTION_TIMEOUT", "600"))  # 10 minutes

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"

# Hugging Face Configuration (optional)
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_CACHE_DIR = os.getenv("HF_CACHE_DIR", str(MODELS_DIR))

# Print configuration on startup
def print_config():
    """Print current configuration"""
    print("=" * 60)
    print("TBU AI Service Configuration")
    print("=" * 60)
    print(f"Whisper Model: {WHISPER_MODEL} (size: {WHISPER_SIZE})")
    print(f"Qwen Model: {QWEN_MODEL} (enabled: {QWEN_ENABLED})")
    print(f"Device: {DEVICE} (compute: {COMPUTE_TYPE})")
    print(f"Language: {DEFAULT_LANGUAGE}")
    print(f"Max File Size: {MAX_FILE_SIZE / (1024 * 1024):.1f} MB")
    print(f"Upload Dir: {UPLOAD_DIR}")
    print(f"Models Dir: {MODELS_DIR}")
    print(f"Server: {HOST}:{PORT}")
    print(f"Auto Format Output: {DEFAULT_FORMAT_OUTPUT}")
    print(f"Auto Line Breaks: {AUTO_LINE_BREAKS}")
    print("=" * 60)
