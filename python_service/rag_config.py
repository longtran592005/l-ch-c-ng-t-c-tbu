"""
RAG Configuration for TBU Chatbot
Cấu hình cho hệ thống RAG Chatbot - Trường Đại học Thái Bình
"""
import os
from pathlib import Path

# ============================================
# PATHS
# ============================================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

# Create necessary directories
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# ============================================
# EMBEDDING MODEL - Qwen3-Embedding-0.6B (Local)
# ============================================
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "Qwen/Qwen3-Embedding-0.6B")
EMBEDDING_DIM = 1024  # Qwen3-Embedding-0.6B output dimension
EMBEDDING_DEVICE = os.getenv("EMBEDDING_DEVICE", "cuda")  # cuda hoặc cpu
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
EMBEDDING_MAX_LENGTH = int(os.getenv("EMBEDDING_MAX_LENGTH", "512"))

# ============================================
# LLM - Ollama qwen2.5:7b (Local)
# ============================================
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))  # Giảm từ 2048 để response nhanh hơn
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "90"))  # seconds
LLM_KEEP_ALIVE = os.getenv("LLM_KEEP_ALIVE", "30m")  # Giữ model trong memory

# ============================================
# RAG SETTINGS
# ============================================
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))  # Số ký tự mỗi chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
TOP_K_RETRIEVAL = int(os.getenv("TOP_K_RETRIEVAL", "3"))  # Giảm từ 5 xuống 3 để nhanh hơn
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.4"))  # Tăng threshold lọc kết quả tốt hơn

# ============================================
# CACHE SETTINGS
# ============================================
ENABLE_QUERY_CACHE = os.getenv("ENABLE_QUERY_CACHE", "true").lower() == "true"
QUERY_CACHE_TTL = int(os.getenv("QUERY_CACHE_TTL", "300"))  # 5 phút
MAX_CACHE_SIZE = int(os.getenv("MAX_CACHE_SIZE", "100"))  # Số câu hỏi cache

# ============================================
# SQL SERVER CONNECTION
# ============================================
# Format: mssql+pyodbc://user:password@server/database?driver=ODBC+Driver+17+for+SQL+Server
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mssql+pyodbc://prisma_user:StrongPassword123!@localhost/tbu_schedule_db?driver=ODBC+Driver+17+for+SQL+Server"
)

# For pyodbc direct connection
SQL_SERVER = os.getenv("SQL_SERVER", "localhost")
SQL_DATABASE = os.getenv("SQL_DATABASE", "tbu_schedule_db")
SQL_USER = os.getenv("SQL_USER", "prisma_user")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "StrongPassword123!")
SQL_DRIVER = os.getenv("SQL_DRIVER", "ODBC Driver 17 for SQL Server")

def get_connection_string():
    """Get pyodbc connection string"""
    return (
        f"DRIVER={{{SQL_DRIVER}}};"
        f"SERVER={SQL_SERVER};"
        f"DATABASE={SQL_DATABASE};"
        f"UID={SQL_USER};"
        f"PWD={SQL_PASSWORD};"
        "TrustServerCertificate=yes;"
    )

# ============================================
# DOCUMENT PATHS
# ============================================
INFO_DOCX_PATH = DATA_DIR / "info.docx"

# ============================================
# SERVER CONFIGURATION
# ============================================
RAG_SERVICE_HOST = os.getenv("RAG_SERVICE_HOST", "0.0.0.0")
RAG_SERVICE_PORT = int(os.getenv("RAG_SERVICE_PORT", "8002"))

# ============================================
# LOGGING
# ============================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOGS_DIR / "rag_service.log"

# ============================================
# PRINT CONFIG
# ============================================
def print_rag_config():
    """Print current RAG configuration"""
    import sys
    # Fix Unicode output for Windows console
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("TBU RAG Chatbot Configuration")
    print("=" * 60)
    print(f"Embedding Model: {EMBEDDING_MODEL}")
    print(f"Embedding Dim: {EMBEDDING_DIM}")
    print(f"Embedding Device: {EMBEDDING_DEVICE}")
    print(f"LLM Model: {OLLAMA_MODEL} (via Ollama)")
    print(f"Ollama URL: {OLLAMA_BASE_URL}")
    print(f"Chunk Size: {CHUNK_SIZE}")
    print(f"Chunk Overlap: {CHUNK_OVERLAP}")
    print(f"Top-K Retrieval: {TOP_K_RETRIEVAL}")
    print(f"Similarity Threshold: {SIMILARITY_THRESHOLD}")
    print(f"SQL Server: {SQL_SERVER}/{SQL_DATABASE}")
    print(f"Info Doc: {INFO_DOCX_PATH}")
    print(f"RAG Service: {RAG_SERVICE_HOST}:{RAG_SERVICE_PORT}")
    print("=" * 60)
