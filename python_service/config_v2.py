"""
Configuration file for TBU AI Service
CPU-optimized for systems with RTX 3050 6GB + 13GB RAM
"""

import os
import torch
import psutil
from pathlib import Path

# ==================== Base Paths ====================
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
UPLOAD_DIR = BASE_DIR / "temp_uploads"
LOGS_DIR = BASE_DIR / "logs"

# Create necessary directories
MODELS_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# ==================== Model Configuration ====================

# Whisper Model Configuration
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "vinai/PhoWhisper-small")
WHISPER_SIZE = os.getenv("WHISPER_SIZE", "small")  # tiny, base, small, medium, large

# Qwen 2.5 Model Configuration
QWEN_MODEL = os.getenv("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct")
QWEN_ENABLED = os.getenv("QWEN_ENABLED", "true").lower() == "true"
QWEN_MAX_NEW_TOKENS = int(os.getenv("QWEN_MAX_NEW_TOKENS", "3072"))
QWEN_TEMPERATURE = float(os.getenv("QWEN_TEMPERATURE", "0.7"))
QWEN_TOP_P = float(os.getenv("QWEN_TOP_P", "0.9"))

# ==================== CPU Optimization Settings ====================
# Critical for systems with < 24GB VRAM
# Force Qwen to CPU to save GPU VRAM for Whisper

# Detect hardware and auto-configure
def detect_and_configure_hardware():
    """Auto-configure based on available hardware"""
    global WHISPER_DEVICE, QWEN_DEVICE, COMPUTE_TYPE, QWEN_FORCE_CPU
    
    total_ram_gb = psutil.virtual_memory().total / (1024**3)
    gpu_available = torch.cuda.is_available()
    gpu_vram_gb = 0
    
    if gpu_available:
        gpu_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"🎮 GPU Detected: {gpu_vram_gb:.1f}GB VRAM")
    else:
        print("⚠️  No GPU detected, using CPU for all models")
    
    # Hardware-based configuration
    if not gpu_available:
        # No GPU - Everything on CPU
        WHISPER_DEVICE = "cpu"
        QWEN_DEVICE = "cpu"
        COMPUTE_TYPE = "int8"
        QWEN_FORCE_CPU = True
        print("⚠️  Running CPU-only mode (no GPU)")
        
    elif gpu_vram_gb < 8:
        # Very low VRAM - Force CPU for Qwen
        WHISPER_DEVICE = "cuda"
        QWEN_DEVICE = "cpu"
        COMPUTE_TYPE = "float16"
        QWEN_FORCE_CPU = True
        print(f"📊 Low VRAM ({gpu_vram_gb:.1f}GB) - Qwen on CPU, Whisper on GPU")
        
    elif gpu_vram_gb < 16 and total_ram_gb < 20:
        # Mid-range GPU + limited RAM
        WHISPER_DEVICE = "cuda"
        QWEN_DEVICE = "cpu"
        COMPUTE_TYPE = "float16"
        QWEN_FORCE_CPU = True
        print(f"📊 Limited RAM ({total_ram_gb:.1f}GB) - Qwen on CPU, Whisper on GPU")
        
    else:
        # Sufficient resources - Can use GPU for both
        WHISPER_DEVICE = "cuda"
        QWEN_DEVICE = "cuda"
        COMPUTE_TYPE = "float16"
        QWEN_FORCE_CPU = False
        print(f"✅ Sufficient resources (RAM: {total_ram_gb:.1f}GB, VRAM: {gpu_vram_gb:.1f}GB) - GPU for both")

# Execute hardware detection on import
detect_and_configure_hardware()

# CPU Memory Management for Qwen 2.5
# For systems with ~13GB available RAM (leaving 3GB for OS)
QWEN_MAX_RAM_USAGE_GB = int(os.getenv("QWEN_MAX_RAM_USAGE_GB", "10"))  # Use 10GB for Qwen
QWEN_USE_LOW_CPU_MEM = os.getenv("QWEN_USE_LOW_CPU_MEM", "true").lower() == "true"

# Token limits to prevent OOM on CPU
# Reduce context window for CPU
QWEN_CONTEXT_LIMIT = int(os.getenv("QWEN_CONTEXT_LIMIT", "4096"))

# Device variables (set by hardware detection)
WHISPER_DEVICE = WHISPER_DEVICE if 'WHISPER_DEVICE' in locals() else (
    os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
)
QWEN_DEVICE = QWEN_DEVICE if 'QWEN_DEVICE' in locals() else "cpu"
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", COMPUTE_TYPE)

# Offloading to disk if needed
QWEN_OFFLOAD_FOLDER = os.getenv("QWEN_OFFLOAD_FOLDER", "offload")

# ==================== Audio Configuration ====================
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))  # 500MB
SUPPORTED_FORMATS = [".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".aac", ".mp4"]

# ==================== Server Configuration ====================
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))

# ==================== Logging Configuration ====================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOGS_DIR / "ai_service.log"

# ==================== Transcription Configuration ====================
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "vi")
DEFAULT_TASK = os.getenv("DEFAULT_TASK", "transcribe")  # transcribe or translate
DEFAULT_FORMAT_OUTPUT = os.getenv("DEFAULT_FORMAT_OUTPUT", "true").lower() == "true"

# ==================== Format Settings ====================
AUTO_LINE_BREAKS = os.getenv("AUTO_LINE_BREAKS", "true").lower() == "true"
SENTENCE_ENDINGS = ['.', '!', '?', '。', '！', '？']
MAX_SENTENCE_LENGTH = int(os.getenv("MAX_SENTENCE_LENGTH", "300"))

# ==================== Performance Settings ====================
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "1"))  # Number of concurrent transcriptions
ENABLE_BATCH_PROCESSING = os.getenv("ENABLE_BATCH_PROCESSING", "false").lower() == "true"

# ==================== Timeout Settings ====================
UPLOAD_TIMEOUT = int(os.getenv("UPLOAD_TIMEOUT", "300"))  # 5 minutes
TRANSCRIPTION_TIMEOUT = int(os.getenv("TRANSCRIPTION_TIMEOUT", "600"))  # 10 minutes
AI_GENERATION_TIMEOUT = int(os.getenv("AI_GENERATION_TIMEOUT", "300"))  # 5 minutes

# ==================== CORS Configuration ====================
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"

# ==================== Hugging Face Configuration ====================
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_CACHE_DIR = os.getenv("HF_CACHE_DIR", str(MODELS_DIR))

# ==================== AI Service Settings ====================
# Backend integration
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "your-secret-key")

# Rate limiting (requests per minute)
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))

# ==================== Print configuration on startup ====================
def print_config():
    """Print current configuration"""
    print("=" * 70)
    print("TBU AI Service - Auto-Configuration")
    print("=" * 70)
    print(f"📊 System Resources:")
    print(f"   Total RAM: {psutil.virtual_memory().total / (1024**3):.1f}GB")
    if torch.cuda.is_available():
        print(f"   GPU VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f}GB")
    print()
    print(f"🎤 Whisper Config:")
    print(f"   Model: {WHISPER_MODEL} (size: {WHISPER_SIZE})")
    print(f"   Device: {WHISPER_DEVICE} (compute: {COMPUTE_TYPE})")
    print()
    print(f"🧠 Qwen 2.5 Config:")
    print(f"   Model: {QWEN_MODEL}")
    print(f"   Enabled: {QWEN_ENABLED}")
    print(f"   Device: {QWEN_DEVICE}")
    print(f"   Force CPU: {QWEN_FORCE_CPU}")
    print(f"   Max RAM: {QWEN_MAX_RAM_USAGE_GB}GB")
    print(f"   Context Limit: {QWEN_CONTEXT_LIMIT} tokens")
    print(f"   Max Tokens: {QWEN_MAX_NEW_TOKENS}")
    print()
    print(f"🔧 Service Settings:")
    print(f"   Server: {HOST}:{PORT}")
    print(f"   Language: {DEFAULT_LANGUAGE}")
    print(f"   Max File Size: {MAX_FILE_SIZE / (1024 * 1024):.1f} MB")
    print(f"   Upload Dir: {UPLOAD_DIR}")
    print(f"   Models Dir: {MODELS_DIR}")
    print(f"   Logs Dir: {LOGS_DIR}")
    print("=" * 70)
