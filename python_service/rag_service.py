"""
FastAPI RAG Service for TBU Chatbot
API endpoints cho RAG Chatbot

@author TBU AI Team
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import logging
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag_config import (
    RAG_SERVICE_HOST, 
    RAG_SERVICE_PORT, 
    print_rag_config,
    OLLAMA_MODEL
)
from rag.rag_chain import rag_chain
from rag.embeddings import embedding_model
from rag.llm_generator import llm_generator
from rag.vector_store import vector_store
from rag.query_cache import query_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# PYDANTIC MODELS
# ============================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    session_id: Optional[str] = Field(None, description="Session ID for conversation tracking")
    chat_history: Optional[List[Dict]] = Field(None, description="Previous messages in conversation")
    source_type: Optional[str] = Field(None, description="Filter by source type (schedule, news, announcement, document)")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    answer: str
    sources: List[Dict]
    query: str
    num_retrieved: int
    session_id: Optional[str]


class IndexSchedulesRequest(BaseModel):
    """Request model for indexing schedules"""
    schedules: List[Dict]


class IndexDocumentRequest(BaseModel):
    """Request model for indexing document"""
    index_document: bool = True


class IndexAllRequest(BaseModel):
    """Request model for full reindex"""
    include_schedules: bool = True
    include_news: bool = True
    include_announcements: bool = True
    include_document: bool = True


class StatsResponse(BaseModel):
    """Response model for stats endpoint"""
    total: int
    by_source: Dict[str, int]


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    service: str
    models: Dict[str, str]
    vector_store: Dict


# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(
    title="TBU RAG Chatbot Service",
    description="RAG-based Chatbot API for Thai Binh University Schedule Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# STARTUP / SHUTDOWN EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize models and connections on startup"""
    logger.info("🚀 Starting TBU RAG Chatbot Service...")
    
    # Print configuration
    print_rag_config()
    
    # Load embedding model
    try:
        logger.info("Loading embedding model...")
        embedding_model.load()
        logger.info("✅ Embedding model loaded")
    except Exception as e:
        logger.error(f"❌ Failed to load embedding model: {e}")
    
    # Check Ollama LLM
    try:
        is_healthy = await llm_generator.check_health()
        if is_healthy:
            logger.info(f"✅ Ollama LLM is ready ({OLLAMA_MODEL})")
        else:
            logger.warning(f"⚠️ Ollama LLM not available. Run: ollama pull {OLLAMA_MODEL}")
    except Exception as e:
        logger.error(f"❌ Failed to check Ollama: {e}")
    
    # Ensure vector store table exists
    try:
        vector_store.ensure_table_exists()
        stats = vector_store.get_stats()
        logger.info(f"✅ Vector store ready. Stats: {stats}")
    except Exception as e:
        logger.error(f"❌ Vector store error: {e}")
    
    logger.info("🎉 RAG Service startup complete!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down RAG Service...")
    
    await llm_generator.close()
    vector_store.close()
    
    logger.info("✅ Cleanup complete")


# ============================================
# HEALTH & STATUS ENDPOINTS
# ============================================

@app.get("/", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint
    Returns service status and model information
    """
    # Check LLM status
    llm_status = "unknown"
    try:
        if await llm_generator.check_health():
            llm_status = "ready"
        else:
            llm_status = "not_available"
    except:
        llm_status = "error"
    
    # Check embedding status
    embedding_status = "loaded" if embedding_model.is_loaded() else "not_loaded"
    
    # Get vector store stats
    try:
        vs_stats = vector_store.get_stats()
    except:
        vs_stats = {"error": "connection_failed"}
    
    return HealthResponse(
        status="ok",
        service="tbu-rag-chatbot",
        models={
            "embedding": f"Qwen3-Embedding-0.6B ({embedding_status})",
            "llm": f"{OLLAMA_MODEL} ({llm_status})"
        },
        vector_store=vs_stats
    )


@app.get("/stats", tags=["Status"])
async def get_stats():
    """
    Get vector store statistics
    Returns count of documents by source type
    """
    try:
        stats = vector_store.get_stats()
        return {
            "status": "ok",
            "total": stats.get('total', 0),
            "by_source": {k: v for k, v in stats.items() if k != 'total'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.get("/cache/stats", tags=["Status"])
async def get_cache_stats():
    """
    Get query cache statistics
    Returns cache hit/miss rates and size
    """
    try:
        stats = query_cache.get_stats()
        return {
            "status": "ok",
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")


@app.post("/cache/clear", tags=["Status"])
async def clear_cache():
    """
    Clear query cache
    Useful after reindexing data
    """
    try:
        query_cache.invalidate()
        return {
            "status": "ok",
            "message": "Cache cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


# ============================================
# CHAT ENDPOINT
# ============================================

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    """
    Main chat endpoint
    Processes user message using RAG pipeline
    
    - Embeds the user's question
    - Retrieves relevant documents from vector store
    - Generates response using Ollama LLM
    """
    try:
        logger.info(f"📩 Chat request: {request.message[:50]}...")
        
        result = await rag_chain.query(
            question=request.message,
            source_type=request.source_type,
            chat_history=request.chat_history
        )
        
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            query=result["query"],
            num_retrieved=result["num_retrieved"],
            session_id=request.session_id
        )
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


# ============================================
# INDEXING ENDPOINTS
# ============================================

@app.post("/index/schedules", tags=["Indexing"])
async def index_schedules(request: IndexSchedulesRequest, background_tasks: BackgroundTasks):
    """
    Index schedules into vector store
    Accepts a list of schedule objects and creates embeddings
    """
    if not request.schedules:
        raise HTTPException(status_code=400, detail="No schedules provided")
    
    try:
        count = await rag_chain.index_schedules(request.schedules)
        return {
            "status": "ok",
            "message": f"Indexed {count} schedules",
            "count": count
        }
    except Exception as e:
        logger.error(f"❌ Index schedules error: {e}")
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")


@app.post("/index/document", tags=["Indexing"])
async def index_document():
    """
    Index info.docx document into vector store
    Reads the document, chunks it, and creates embeddings
    """
    try:
        count = await rag_chain.index_document()
        return {
            "status": "ok",
            "message": f"Indexed {count} document chunks",
            "count": count
        }
    except Exception as e:
        logger.error(f"❌ Index document error: {e}")
        raise HTTPException(status_code=500, detail=f"Document indexing failed: {str(e)}")


@app.post("/index/news", tags=["Indexing"])
async def index_news(news_list: List[Dict]):
    """
    Index news articles into vector store
    """
    try:
        count = await rag_chain.index_news(news_list)
        return {
            "status": "ok",
            "message": f"Indexed {count} news chunks",
            "count": count
        }
    except Exception as e:
        logger.error(f"❌ Index news error: {e}")
        raise HTTPException(status_code=500, detail=f"News indexing failed: {str(e)}")


@app.post("/index/announcements", tags=["Indexing"])
async def index_announcements(announcements: List[Dict]):
    """
    Index announcements into vector store
    """
    try:
        count = await rag_chain.index_announcements(announcements)
        return {
            "status": "ok", 
            "message": f"Indexed {count} announcement chunks",
            "count": count
        }
    except Exception as e:
        logger.error(f"❌ Index announcements error: {e}")
        raise HTTPException(status_code=500, detail=f"Announcements indexing failed: {str(e)}")


@app.post("/reindex-all", tags=["Indexing"])
async def reindex_all(background_tasks: BackgroundTasks):
    """
    Trigger full reindex of all data from database
    This is a long-running operation
    """
    try:
        # Run in background for large datasets
        logger.info("🔄 Starting full reindex...")
        results = await rag_chain.reindex_all_from_db()
        
        return {
            "status": "ok",
            "message": "Full reindex completed",
            "results": results
        }
    except Exception as e:
        logger.error(f"❌ Reindex all error: {e}")
        raise HTTPException(status_code=500, detail=f"Full reindex failed: {str(e)}")


# ============================================
# MANAGEMENT ENDPOINTS
# ============================================

@app.delete("/vectors/{source_type}", tags=["Management"])
async def delete_vectors(source_type: str):
    """
    Delete all vectors of a specific source type
    """
    valid_types = ['schedule', 'news', 'announcement', 'document']
    if source_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid source type. Must be one of: {valid_types}")
    
    try:
        deleted = vector_store.delete_by_source(source_type)
        return {
            "status": "ok",
            "message": f"Deleted {deleted} vectors of type '{source_type}'",
            "deleted": deleted
        }
    except Exception as e:
        logger.error(f"❌ Delete vectors error: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@app.delete("/vectors", tags=["Management"])
async def delete_all_vectors():
    """
    Delete ALL vectors from the store
    Use with caution!
    """
    try:
        deleted = vector_store.delete_all()
        return {
            "status": "ok",
            "message": f"Deleted all {deleted} vectors",
            "deleted": deleted
        }
    except Exception as e:
        logger.error(f"❌ Delete all vectors error: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # Check for --no-reload flag
    no_reload = "--no-reload" in sys.argv
    
    if no_reload:
        # Production mode - no reload
        uvicorn.run(
            "rag_service:app",
            host=RAG_SERVICE_HOST,
            port=RAG_SERVICE_PORT,
            reload=False,
            log_level="info"
        )
    else:
        # Development mode - auto reload on file changes
        uvicorn.run(
            "rag_service:app",
            host=RAG_SERVICE_HOST,
            port=RAG_SERVICE_PORT,
            reload=True,
            reload_dirs=[".", "rag"],  # Watch current dir and rag folder
            reload_includes=["*.py"],   # Only reload on Python file changes
            reload_excludes=["__pycache__", "*.pyc", "logs/*", "data/*", "temp_*"],
            log_level="info"
        )
