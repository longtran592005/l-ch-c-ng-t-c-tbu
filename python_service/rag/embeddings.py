"""
Qwen3-Embedding-0.6B Wrapper for Local Embedding
Sử dụng model Qwen3-Embedding để tạo vector embeddings

@author TBU AI Team
"""
import torch
import numpy as np
from typing import List, Optional
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import (
    EMBEDDING_MODEL, 
    EMBEDDING_DEVICE, 
    EMBEDDING_BATCH_SIZE, 
    EMBEDDING_DIM,
    EMBEDDING_MAX_LENGTH
)

logger = logging.getLogger(__name__)


class QwenEmbedding:
    """
    Qwen3-Embedding-0.6B for text embedding
    Singleton pattern để chỉ load model 1 lần
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.model_name = EMBEDDING_MODEL
        self.device = self._detect_device()
        self.model = None
        self.tokenizer = None
        self._initialized = True
        
    def _detect_device(self) -> str:
        """Detect available device (CUDA > CPU)"""
        if EMBEDDING_DEVICE == "cuda" and torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logger.info(f"🎮 CUDA Available - GPU: {device_name}, VRAM: {vram:.1f}GB")
            return "cuda"
        else:
            logger.info("⚠️ Using CPU for embeddings (slower)")
            return "cpu"
    
    def load(self):
        """Load model vào memory"""
        if self.model is not None:
            logger.info("✅ Embedding model already loaded")
            return
        
        try:
            from transformers import AutoTokenizer, AutoModel
            
            logger.info(f"🚀 Loading Qwen3-Embedding model: {self.model_name}")
            logger.info("⏳ This may take a few minutes for first download...")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )
            
            # Load model with appropriate dtype
            torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
            
            self.model = AutoModel.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                torch_dtype=torch_dtype
            )
            
            # Move to device
            if self.device == "cuda":
                self.model = self.model.cuda()
            
            # Set to evaluation mode
            self.model.eval()
            
            logger.info(f"✅ Embedding model loaded successfully on {self.device.upper()}")
            
            # Log memory usage
            if self.device == "cuda":
                allocated = torch.cuda.memory_allocated() / 1024**3
                logger.info(f"📊 GPU Memory allocated: {allocated:.2f}GB")
                
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    
    def embed_text(self, text: str) -> np.ndarray:
        """
        Embed single text string
        
        Args:
            text: Text to embed
            
        Returns:
            numpy array of shape (embedding_dim,)
        """
        return self.embed_texts([text])[0]
    
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Embed multiple texts với batching để tối ưu performance
        
        Args:
            texts: List of texts to embed
            
        Returns:
            numpy array of shape (num_texts, embedding_dim)
        """
        # Ensure model is loaded
        self.load()
        
        if not texts:
            return np.array([])
        
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[i:i + EMBEDDING_BATCH_SIZE]
            
            # Tokenize
            inputs = self.tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=EMBEDDING_MAX_LENGTH,
                return_tensors="pt"
            )
            
            # Move to device
            if self.device == "cuda":
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                
                # Mean pooling over sequence length
                # outputs.last_hidden_state shape: (batch_size, seq_len, hidden_dim)
                attention_mask = inputs['attention_mask']
                
                # Expand attention mask for broadcasting
                mask_expanded = attention_mask.unsqueeze(-1).expand(outputs.last_hidden_state.size()).float()
                
                # Sum and normalize
                sum_embeddings = torch.sum(outputs.last_hidden_state * mask_expanded, 1)
                sum_mask = torch.clamp(mask_expanded.sum(1), min=1e-9)
                embeddings = sum_embeddings / sum_mask
                
                # L2 normalize
                embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
                
                # Move to CPU and convert to numpy
                all_embeddings.append(embeddings.cpu().numpy())
        
        # Concatenate all batches
        result = np.vstack(all_embeddings)
        
        logger.debug(f"Embedded {len(texts)} texts, output shape: {result.shape}")
        
        return result
    
    @property
    def dimension(self) -> int:
        """Return embedding dimension"""
        return EMBEDDING_DIM
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None


# Singleton instance for global use
embedding_model = QwenEmbedding()


# Test function
def test_embedding():
    """Test embedding functionality"""
    print("Testing Qwen3-Embedding...")
    
    model = QwenEmbedding()
    model.load()
    
    test_texts = [
        "Lịch công tác hôm nay của Hiệu trưởng",
        "Cuộc họp Ban Giám hiệu lúc 8h sáng",
        "Trường Đại học Thái Bình"
    ]
    
    embeddings = model.embed_texts(test_texts)
    
    print(f"Input texts: {len(test_texts)}")
    print(f"Output shape: {embeddings.shape}")
    print(f"Embedding dimension: {model.dimension}")
    
    # Test similarity
    from numpy.linalg import norm
    
    def cosine_sim(a, b):
        return np.dot(a, b) / (norm(a) * norm(b))
    
    print("\nCosine similarities:")
    for i in range(len(test_texts)):
        for j in range(i+1, len(test_texts)):
            sim = cosine_sim(embeddings[i], embeddings[j])
            print(f"  '{test_texts[i][:30]}...' vs '{test_texts[j][:30]}...': {sim:.4f}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_embedding()
