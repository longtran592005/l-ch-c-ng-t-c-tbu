"""
Query Cache for RAG Pipeline
Cache câu trả lời để tăng tốc các câu hỏi lặp lại

@author TBU AI Team
"""
import time
import hashlib
from typing import Dict, Optional, Any
from collections import OrderedDict
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import ENABLE_QUERY_CACHE, QUERY_CACHE_TTL, MAX_CACHE_SIZE

logger = logging.getLogger(__name__)


class QueryCache:
    """
    Simple in-memory LRU cache for RAG responses
    - Cache theo hash của query (normalized)
    - TTL-based expiration
    - LRU eviction khi full
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
            
        self.enabled = ENABLE_QUERY_CACHE
        self.ttl = QUERY_CACHE_TTL
        self.max_size = MAX_CACHE_SIZE
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.hits = 0
        self.misses = 0
        self._initialized = True
        
        logger.info(f"📦 Query Cache initialized (enabled={self.enabled}, ttl={self.ttl}s, max={self.max_size})")
    
    def _normalize_query(self, query: str) -> str:
        """
        Chuẩn hóa query để so sánh
        - Lowercase
        - Bỏ khoảng trắng thừa
        - Bỏ dấu câu cuối
        """
        normalized = query.lower().strip()
        # Bỏ dấu câu cuối
        while normalized and normalized[-1] in '?!.,;:':
            normalized = normalized[:-1]
        # Bỏ khoảng trắng thừa
        normalized = ' '.join(normalized.split())
        return normalized
    
    def _get_cache_key(self, query: str, source_type: str = None) -> str:
        """Tạo cache key từ query"""
        normalized = self._normalize_query(query)
        key_str = f"{normalized}|{source_type or 'all'}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, query: str, source_type: str = None) -> Optional[Dict]:
        """
        Lấy cached response
        
        Returns:
            Cached response dict or None if miss/expired
        """
        if not self.enabled:
            return None
            
        key = self._get_cache_key(query, source_type)
        
        if key in self.cache:
            entry = self.cache[key]
            
            # Check expiration
            if time.time() - entry['timestamp'] < self.ttl:
                # Move to end (LRU)
                self.cache.move_to_end(key)
                self.hits += 1
                logger.debug(f"🎯 Cache HIT for query: {query[:50]}...")
                return entry['response']
            else:
                # Expired, remove
                del self.cache[key]
        
        self.misses += 1
        return None
    
    def set(self, query: str, response: Dict, source_type: str = None):
        """
        Lưu response vào cache
        """
        if not self.enabled:
            return
            
        key = self._get_cache_key(query, source_type)
        
        # Evict oldest if full
        while len(self.cache) >= self.max_size:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[key] = {
            'response': response,
            'timestamp': time.time(),
            'query': query
        }
        logger.debug(f"📝 Cached response for query: {query[:50]}...")
    
    def invalidate(self, pattern: str = None):
        """
        Xóa cache
        
        Args:
            pattern: Nếu None, xóa toàn bộ. Nếu có, xóa entries chứa pattern
        """
        if pattern is None:
            self.cache.clear()
            logger.info("🗑️ Cache cleared completely")
        else:
            keys_to_delete = [
                k for k, v in self.cache.items() 
                if pattern.lower() in v.get('query', '').lower()
            ]
            for k in keys_to_delete:
                del self.cache[k]
            logger.info(f"🗑️ Cleared {len(keys_to_delete)} cache entries matching '{pattern}'")
    
    def get_stats(self) -> Dict:
        """Lấy thống kê cache"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        
        return {
            'enabled': self.enabled,
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.1f}%",
            'ttl': self.ttl
        }


# Singleton instance
query_cache = QueryCache()
