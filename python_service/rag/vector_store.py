"""
SQL Server Vector Store for RAG
Lưu trữ và tìm kiếm vector embeddings trong SQL Server

@author TBU AI Team
"""
import pyodbc
import numpy as np
import json
import uuid
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import get_connection_string, EMBEDDING_DIM

logger = logging.getLogger(__name__)


def numpy_to_bytes(arr: np.ndarray) -> bytes:
    """
    Convert numpy array to bytes for SQL Server VARBINARY storage
    
    Args:
        arr: numpy array of float32
        
    Returns:
        bytes representation
    """
    return arr.astype(np.float32).tobytes()


def bytes_to_numpy(data: bytes) -> np.ndarray:
    """
    Convert bytes back to numpy array
    
    Args:
        data: bytes from SQL Server
        
    Returns:
        numpy array of float32
    """
    return np.frombuffer(data, dtype=np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors
    
    Args:
        a, b: vectors to compare
        
    Returns:
        similarity score between -1 and 1
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))


class SQLServerVectorStore:
    """
    Vector store using SQL Server
    Supports: add, search, delete operations
    """
    
    def __init__(self, connection_string: str = None):
        """
        Initialize vector store
        
        Args:
            connection_string: ODBC connection string
        """
        self.connection_string = connection_string or get_connection_string()
        self._conn = None
        
    def _get_connection(self) -> pyodbc.Connection:
        """Get or create database connection"""
        if self._conn is None or self._conn.closed:
            try:
                self._conn = pyodbc.connect(self.connection_string)
                logger.info("✅ Connected to SQL Server")
            except Exception as e:
                logger.error(f"❌ Failed to connect to SQL Server: {e}")
                raise
        return self._conn
    
    def close(self):
        """Close database connection"""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
            logger.info("🔌 SQL Server connection closed")
    
    def ensure_table_exists(self):
        """Create vector_embeddings table if not exists"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vector_embeddings' AND xtype='U')
            CREATE TABLE vector_embeddings (
                id NVARCHAR(255) PRIMARY KEY,
                source_type NVARCHAR(50) NOT NULL,
                source_id NVARCHAR(255),
                content NTEXT NOT NULL,
                metadata NTEXT,
                embedding VARBINARY(MAX) NOT NULL,
                embedding_dim INT DEFAULT 1024,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE()
            )
        """)
        
        # Create indexes
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ve_source_type')
            CREATE INDEX idx_ve_source_type ON vector_embeddings(source_type)
        """)
        
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ve_source_id')
            CREATE INDEX idx_ve_source_id ON vector_embeddings(source_id)
        """)
        
        conn.commit()
        logger.info("✅ Vector embeddings table ready")
    
    def add_documents(
        self,
        texts: List[str],
        embeddings: np.ndarray,
        source_type: str,
        source_ids: List[str] = None,
        metadatas: List[Dict] = None
    ) -> List[str]:
        """
        Add documents with embeddings to vector store
        
        Args:
            texts: List of text content
            embeddings: numpy array of embeddings (num_docs, embedding_dim)
            source_type: Type of source (schedule, news, announcement, document)
            source_ids: Optional list of source IDs
            metadatas: Optional list of metadata dicts
            
        Returns:
            List of generated document IDs
        """
        self.ensure_table_exists()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        ids = []
        
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            doc_id = str(uuid.uuid4())
            source_id = source_ids[i] if source_ids else None
            metadata = json.dumps(metadatas[i], ensure_ascii=False) if metadatas and i < len(metadatas) else None
            embedding_bytes = numpy_to_bytes(embedding)
            
            cursor.execute("""
                INSERT INTO vector_embeddings 
                (id, source_type, source_id, content, metadata, embedding, embedding_dim, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
            """, (doc_id, source_type, source_id, text, metadata, embedding_bytes, EMBEDDING_DIM))
            
            ids.append(doc_id)
        
        conn.commit()
        logger.info(f"✅ Added {len(ids)} documents to vector store (source_type={source_type})")
        
        return ids
    
    def similarity_search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        source_type: str = None,
        threshold: float = 0.3
    ) -> List[Tuple[str, str, float, Dict]]:
        """
        Search similar documents using cosine similarity
        
        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            source_type: Filter by source type (optional)
            threshold: Minimum similarity threshold
            
        Returns:
            List of (id, content, similarity_score, metadata) tuples
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Fetch embeddings from database
        if source_type:
            cursor.execute("""
                SELECT id, content, metadata, embedding 
                FROM vector_embeddings 
                WHERE source_type = ?
            """, (source_type,))
        else:
            cursor.execute("""
                SELECT id, content, metadata, embedding 
                FROM vector_embeddings
            """)
        
        results = []
        
        for row in cursor.fetchall():
            doc_id, content, metadata_json, embedding_bytes = row
            
            # Convert bytes to numpy array
            doc_embedding = bytes_to_numpy(embedding_bytes)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(query_embedding, doc_embedding)
            
            # Filter by threshold
            if similarity >= threshold:
                metadata = json.loads(metadata_json) if metadata_json else {}
                results.append((doc_id, content, similarity, metadata))
        
        # Sort by similarity descending
        results.sort(key=lambda x: x[2], reverse=True)
        
        # Return top-k results
        top_results = results[:top_k]
        
        logger.debug(f"Found {len(results)} docs above threshold, returning top {len(top_results)}")
        
        return top_results
    
    def delete_by_source(self, source_type: str, source_id: str = None) -> int:
        """
        Delete documents by source type and/or source ID
        
        Args:
            source_type: Source type to delete
            source_id: Specific source ID (optional)
            
        Returns:
            Number of deleted documents
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if source_id:
            cursor.execute("""
                DELETE FROM vector_embeddings 
                WHERE source_type = ? AND source_id = ?
            """, (source_type, source_id))
        else:
            cursor.execute("""
                DELETE FROM vector_embeddings 
                WHERE source_type = ?
            """, (source_type,))
        
        deleted = cursor.rowcount
        conn.commit()
        
        logger.info(f"🗑️ Deleted {deleted} documents (source_type={source_type}, source_id={source_id})")
        
        return deleted
    
    def delete_all(self) -> int:
        """Delete all documents from vector store"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM vector_embeddings")
        deleted = cursor.rowcount
        conn.commit()
        
        logger.info(f"🗑️ Deleted all {deleted} documents from vector store")
        
        return deleted
    
    def get_stats(self) -> Dict:
        """
        Get statistics about vector store
        
        Returns:
            Dict with count per source_type and total
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT source_type, COUNT(*) as count 
            FROM vector_embeddings 
            GROUP BY source_type
        """)
        
        stats = {row[0]: row[1] for row in cursor.fetchall()}
        stats['total'] = sum(stats.values())
        
        return stats
    
    def get_document_by_id(self, doc_id: str) -> Optional[Dict]:
        """Get document by ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, source_type, source_id, content, metadata, created_at
            FROM vector_embeddings 
            WHERE id = ?
        """, (doc_id,))
        
        row = cursor.fetchone()
        if row:
            return {
                "id": row[0],
                "source_type": row[1],
                "source_id": row[2],
                "content": row[3],
                "metadata": json.loads(row[4]) if row[4] else {},
                "created_at": row[5]
            }
        return None


# Singleton instance
vector_store = SQLServerVectorStore()


# Test function
def test_vector_store():
    """Test vector store functionality"""
    print("Testing SQL Server Vector Store...")
    
    store = SQLServerVectorStore()
    store.ensure_table_exists()
    
    # Test data
    texts = ["Test document 1", "Test document 2"]
    embeddings = np.random.rand(2, EMBEDDING_DIM).astype(np.float32)
    
    # Add documents
    ids = store.add_documents(
        texts=texts,
        embeddings=embeddings,
        source_type="test",
        metadatas=[{"test": "data1"}, {"test": "data2"}]
    )
    print(f"Added documents: {ids}")
    
    # Get stats
    stats = store.get_stats()
    print(f"Stats: {stats}")
    
    # Search
    query_embedding = embeddings[0]
    results = store.similarity_search(query_embedding, top_k=2)
    print(f"Search results: {len(results)}")
    for doc_id, content, score, metadata in results:
        print(f"  - {content}: {score:.4f}")
    
    # Cleanup
    deleted = store.delete_by_source("test")
    print(f"Deleted {deleted} test documents")
    
    store.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_vector_store()
