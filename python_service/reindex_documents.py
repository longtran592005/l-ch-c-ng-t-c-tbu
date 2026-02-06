"""
Script để re-index lại toàn bộ documents với cấu hình RAG mới
Chạy sau khi đã cập nhật CHUNK_SIZE, CHUNK_OVERLAP...

Usage: python reindex_documents.py
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
from rag_config import print_rag_config, CHUNK_SIZE, CHUNK_OVERLAP, TOP_K_RETRIEVAL, SIMILARITY_THRESHOLD

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    print("\n" + "=" * 60)
    print("🔄 RAG DOCUMENT RE-INDEXING TOOL")
    print("=" * 60)
    
    # Print current config
    print_rag_config()
    
    print(f"\n📊 Optimized Settings:")
    print(f"   • CHUNK_SIZE: {CHUNK_SIZE} (larger chunks = better context)")
    print(f"   • CHUNK_OVERLAP: {CHUNK_OVERLAP} (more overlap = no info loss)")
    print(f"   • TOP_K_RETRIEVAL: {TOP_K_RETRIEVAL} (more results = wider search)")
    print(f"   • SIMILARITY_THRESHOLD: {SIMILARITY_THRESHOLD} (lower = more results)")
    
    # Confirm before proceeding
    print("\n⚠️  This will DELETE all existing embeddings and re-create them!")
    confirm = input("Proceed? [y/N]: ").strip().lower()
    
    if confirm != 'y':
        print("❌ Cancelled.")
        return
    
    # Import components
    print("\n🚀 Loading components...")
    from rag.embeddings import embedding_model
    from rag.vector_store import vector_store
    from rag.document_loader import load_info_docx
    
    # Load embedding model
    print("📥 Loading embedding model...")
    embedding_model.load()
    
    # Delete old document embeddings
    print("\n🗑️  Deleting old document embeddings...")
    deleted = vector_store.delete_by_source('document')
    print(f"   Deleted {deleted} old document embeddings")
    
    # Load and process info.docx with new chunking
    print("\n📄 Loading info.docx with semantic chunking...")
    doc_chunks = load_info_docx()
    print(f"   Created {len(doc_chunks)} semantic chunks")
    
    if not doc_chunks:
        print("⚠️  No chunks loaded from info.docx!")
        return
    
    # Extract texts and metadata
    texts = [chunk['content'] for chunk in doc_chunks]
    metadatas = [chunk['metadata'] for chunk in doc_chunks]
    
    # Generate embeddings
    print(f"\n🧠 Generating embeddings for {len(texts)} chunks...")
    embeddings = embedding_model.embed_texts(texts)
    print(f"   Embedding shape: {embeddings.shape}")
    
    # Store in vector database
    print("\n💾 Storing in vector database...")
    doc_ids = vector_store.add_documents(
        texts=texts,
        embeddings=embeddings,
        source_type='document',
        metadatas=metadatas
    )
    print(f"   Added {len(doc_ids)} documents to vector store")
    
    # Get final stats
    print("\n📊 Final Vector Store Stats:")
    stats = vector_store.get_stats()
    for source_type, count in stats.get('by_source', {}).items():
        print(f"   • {source_type}: {count} documents")
    print(f"   • TOTAL: {stats.get('total', 0)} documents")
    
    print("\n" + "=" * 60)
    print("✅ RE-INDEXING COMPLETE!")
    print("=" * 60)
    print("\n💡 Next steps:")
    print("   1. Restart RAG service: python rag_service.py")
    print("   2. Test chatbot với các câu hỏi về thông tin trường")
    print("   3. Nếu vẫn có vấn đề, kiểm tra info.docx có đủ thông tin không")


if __name__ == "__main__":
    main()
