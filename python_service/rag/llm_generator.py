"""
Ollama qwen2.5:7b Wrapper for Response Generation
Sử dụng Ollama local để generate response từ RAG context

@author TBU AI Team
"""
import httpx
import json
from typing import List, Dict, Optional
import logging
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import (
    OLLAMA_BASE_URL, 
    OLLAMA_MODEL, 
    LLM_TEMPERATURE, 
    LLM_MAX_TOKENS,
    LLM_TIMEOUT,
    LLM_KEEP_ALIVE
)

logger = logging.getLogger(__name__)


# System prompt cho chatbot TBU
SYSTEM_PROMPT = """Bạn là Trợ lý ảo TBU - chatbot hỗ trợ tra cứu thông tin cho Trường Đại học Thái Bình.

NHIỆM VỤ CỦA BẠN:
1. Trả lời câu hỏi DỰA TRÊN thông tin trong CONTEXT được cung cấp
2. Nếu thông tin KHÔNG CÓ trong CONTEXT, hãy nói rõ là bạn không có thông tin đó
3. Trả lời ngắn gọn, chính xác, thân thiện và chuyên nghiệp
4. Sử dụng format markdown khi cần (bold, bullet points, numbered list)
5. LUÔN trả lời bằng tiếng Việt

HƯỚNG DẪN TRẢ LỜI VỀ LỊCH CÔNG TÁC:
- Khi có lịch: Liệt kê ĐẦY ĐỦ thông tin theo format:
  • **Thời gian**: [giờ bắt đầu - giờ kết thúc]
  • **Nội dung**: [mô tả hoạt động]
  • **Địa điểm**: [nơi diễn ra]
  • **Chủ trì**: [người chủ trì]
  • **Thành phần**: [ai tham dự]
- Khi KHÔNG có lịch: Trả lời rõ ràng "Không có lịch công tác vào [thời gian]"
- Nếu có nhiều lịch, liệt kê theo thứ tự thời gian

HƯỚNG DẪN TRẢ LỜI KHÁC:
- Về TIN TỨC/THÔNG BÁO: Tóm tắt nội dung chính, nêu ngày đăng
- Về THÔNG TIN TRƯỜNG: Cung cấp thông tin chính xác từ context

LƯU Ý QUAN TRỌNG:
- KHÔNG bịa đặt thông tin không có trong context
- Nếu không chắc chắn, nói "Theo thông tin tôi có..."
- Nếu context rỗng hoặc không liên quan, thông báo không tìm thấy thông tin
- Chú ý ngày hiện tại khi trả lời về "hôm nay", "ngày mai", etc."""


class OllamaGenerator:
    """
    Ollama LLM Generator for response generation
    Uses qwen2.5:7b model running locally
    """
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.client = None
        
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self.client is None:
            self.client = httpx.AsyncClient(timeout=LLM_TIMEOUT)
        return self.client
    
    async def check_health(self) -> bool:
        """
        Check if Ollama is running and model is available
        
        Returns:
            True if Ollama is healthy
        """
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/api/tags")
            
            if response.status_code == 200:
                data = response.json()
                models = [m.get('name', '') for m in data.get('models', [])]
                
                # Check if our model is available
                model_available = any(self.model in m for m in models)
                
                if model_available:
                    logger.info(f"✅ Ollama is running with model {self.model}")
                else:
                    logger.warning(f"⚠️ Model {self.model} not found. Available: {models}")
                    logger.warning(f"Run: ollama pull {self.model}")
                
                return model_available
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Ollama health check failed: {e}")
            return False
    
    async def generate(
        self,
        query: str,
        context_docs: List[Dict],
        chat_history: List[Dict] = None,
        temperature: float = None,
        max_tokens: int = None,
        extra_context: str = None
    ) -> str:
        """
        Generate response using RAG context
        
        Args:
            query: User's question
            context_docs: List of retrieved documents with 'content' and 'metadata'
            chat_history: Optional conversation history
            temperature: Override default temperature
            max_tokens: Override default max tokens
            extra_context: Extra context like current date
            
        Returns:
            Generated response text
        """
        client = await self._get_client()
        
        # Build context string from retrieved documents
        context_parts = []
        for i, doc in enumerate(context_docs, 1):
            content = doc.get('content', '')
            metadata = doc.get('metadata', {})
            source_type = metadata.get('source_type', 'unknown')
            score = doc.get('score', 0)
            
            context_parts.append(f"[{i}] (Nguồn: {source_type}, Độ liên quan: {score:.2f})\n{content}")
        
        context_str = "\n\n---\n\n".join(context_parts) if context_parts else "Không có thông tin liên quan."
        
        # Build messages array
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Add chat history (last 4 messages for context)
        if chat_history:
            for msg in chat_history[-4:]:
                role = msg.get('role', 'user')
                # Map 'bot' to 'assistant' for Ollama
                if role == 'bot':
                    role = 'assistant'
                messages.append({
                    "role": role,
                    "content": msg.get('content', '')
                })
        
        # Build user prompt with context
        date_context = f"\n\n📅 NGÀY HIỆN TẠI: {extra_context}\n" if extra_context else ""
        
        user_prompt = f"""CONTEXT (Thông tin liên quan):
{context_str}
{date_context}
---

CÂU HỎI CỦA NGƯỜI DÙNG: {query}

Hãy trả lời câu hỏi dựa trên thông tin trong CONTEXT ở trên. Nếu không có thông tin liên quan, hãy nói rõ."""
        
        messages.append({"role": "user", "content": user_prompt})
        
        # Call Ollama API
        try:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": LLM_KEEP_ALIVE,  # Giữ model trong memory
                    "options": {
                        "temperature": temperature or LLM_TEMPERATURE,
                        "num_predict": max_tokens or LLM_MAX_TOKENS,
                        "num_ctx": 4096  # Giảm context window để nhanh hơn
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result.get("message", {}).get("content", "")
                
                if answer:
                    logger.info(f"✅ Generated response ({len(answer)} chars)")
                    return answer.strip()
                else:
                    logger.warning("⚠️ Empty response from Ollama")
                    return "Xin lỗi, tôi không thể tạo câu trả lời lúc này. Vui lòng thử lại."
            else:
                logger.error(f"❌ Ollama API error: {response.status_code} - {response.text}")
                return "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại sau."
            
        except httpx.TimeoutException:
            logger.error("❌ Ollama request timed out")
            return "Xin lỗi, yêu cầu mất quá nhiều thời gian. Vui lòng thử lại với câu hỏi ngắn hơn."
        except Exception as e:
            logger.error(f"❌ Ollama error: {e}")
            return "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại sau."
    
    async def generate_simple(self, prompt: str) -> str:
        """
        Simple generation without RAG context
        Useful for testing or simple responses
        
        Args:
            prompt: Direct prompt to send
            
        Returns:
            Generated response
        """
        client = await self._get_client()
        
        try:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": LLM_TEMPERATURE,
                        "num_predict": LLM_MAX_TOKENS
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                return f"Error: {response.status_code}"
                
        except Exception as e:
            logger.error(f"❌ Simple generation error: {e}")
            return f"Error: {str(e)}"
    
    async def close(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
            logger.info("🔌 Ollama client closed")


# Singleton instance
llm_generator = OllamaGenerator()


# Test function
async def test_llm_generator():
    """Test LLM generator functionality"""
    print("Testing Ollama LLM Generator...")
    
    generator = OllamaGenerator()
    
    # Check health
    is_healthy = await generator.check_health()
    print(f"Ollama health: {is_healthy}")
    
    if not is_healthy:
        print("❌ Ollama is not running or model not available")
        print(f"Please start Ollama and run: ollama pull {OLLAMA_MODEL}")
        return
    
    # Test simple generation
    print("\n--- Simple Generation Test ---")
    response = await generator.generate_simple("Xin chào, bạn là ai?")
    print(f"Response: {response[:200]}...")
    
    # Test RAG generation
    print("\n--- RAG Generation Test ---")
    context_docs = [
        {
            "content": "Lịch công tác ngày 22/01/2026 (Thứ 5)\nThời gian: 08:00 - 11:00\nNội dung: Họp Ban Giám hiệu\nĐịa điểm: Phòng họp A1\nChủ trì: Hiệu trưởng",
            "metadata": {"source_type": "schedule"},
            "score": 0.85
        }
    ]
    
    response = await generator.generate(
        query="Hôm nay có lịch gì?",
        context_docs=context_docs
    )
    print(f"RAG Response: {response}")
    
    await generator.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_llm_generator())
