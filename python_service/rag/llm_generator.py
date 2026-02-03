"""
LLM Generator Orchestrator
Điều phối việc generate response từ các LLM khác nhau (Ollama, Gemini, ...)

@author TBU AI Team
"""
import httpx
import json
import logging
import asyncio
import os
import sys
from typing import List, Dict, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import (
    OLLAMA_BASE_URL, 
    OLLAMA_MODEL, 
    GEMINI_API_KEY,
    GEMINI_MODEL,
    LLM_TEMPERATURE, 
    LLM_MAX_TOKENS,
    LLM_TIMEOUT,
    LLM_KEEP_ALIVE,
    get_active_llm_provider
)

logger = logging.getLogger(__name__)

# System prompt cho chatbot TBU
SYSTEM_PROMPT = """Bạn là Trợ lý ảo TBU - chatbot hỗ trợ tra cứu thông tin cho Trường Đại học Thái Bình.

QUY TẮC TRẢ LỜI:
1. Chỉ trả lời DỰA TRÊN thông tin trong CONTEXT. Nếu không có, hãy nói "Tôi không tìm thấy thông tin này".
2. TẬP TRUNG vào đúng ngày/đối tượng được hỏi. Nếu người dùng hỏi về một ngày cụ thể, hãy BỎ QUA các thông tin về ngày khác trong context.
3. TRẢ LỜI NGẮN GỌN, đi thẳng vào vấn đề. Không lặp lại các thông tin thừa hoặc không liên quan.
4. Sử dụng markdown (bold, bullet points) để dễ đọc. LUÔN trả lời bằng tiếng Việt.

ĐỊNH DẠNG TRẢ LỜI LỊCH CÔNG TÁC:
- Nếu có lịch:
  • **Thời gian**: [giờ]
  • **Nội dung**: [tóm tắt ngắn gọn]
  • **Địa điểm**: [nơi diễn ra]
  • **Thành phần**: [người tham dự]
- Nếu KHÔNG có lịch: Trả lời "Không có lịch công tác vào ngày [dd/mm/yyyy]".
- Nếu có nhiều lịch trong 1 ngày, liệt kê theo danh sách.

LƯU Ý:
- Không thêm các câu xã giao thừa thãi trừ khi là lời chào đầu tiên.
- Kiểm tra kỹ ngày tháng trong context để đảm bảo trả lời đúng ngày người dùng yêu cầu.
- Khi liệt kê lịch, không cần ghi "Chủ trì: Không có thông tin" nếu không có, hãy bỏ qua dòng đó luôn."""

class OllamaProvider:
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.client = None
        
    async def _get_client(self) -> httpx.AsyncClient:
        if self.client is None:
            self.client = httpx.AsyncClient(timeout=LLM_TIMEOUT)
        return self.client
    
    async def check_health(self) -> bool:
        try:
            client = await self._get_client()
            response = await client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get('name', '') for m in data.get('models', [])]
                return any(self.model in m for m in models)
            return False
        except Exception as e:
            logger.error(f"❌ Ollama health check failed: {e}")
            return False
            
    async def generate(self, query: str, context_str: str, chat_history: List[Dict], extra_context: str = None) -> str:
        client = await self._get_client()
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        if chat_history:
            for msg in chat_history[-4:]:
                role = "assistant" if msg.get("role") == "bot" else "user"
                messages.append({"role": role, "content": msg.get("content", "")})
        
        date_context = f"\n\n📅 NGÀY HIỆN TẠI: {extra_context}\n" if extra_context else ""
        user_prompt = f"CONTEXT (Thông tin liên quan):\n{context_str}\n{date_context}\n---\nCÂU HỎI CỦA NGƯỜI DÙNG: {query}"
        messages.append({"role": "user", "content": user_prompt})
        
        try:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": LLM_KEEP_ALIVE,
                    "options": {"temperature": LLM_TEMPERATURE, "num_predict": LLM_MAX_TOKENS, "num_ctx": 4096}
                }
            )
            if response.status_code == 200:
                return response.json().get("message", {}).get("content", "").strip()
            return f"Error from Ollama: {response.status_code}"
        except Exception as e:
            logger.error(f"❌ Ollama generate error: {e}")
            return "Lỗi khi kết nối với Ollama."

    async def generate_plain(self, prompt: str, temperature: float = None, max_tokens: int = None) -> str:
        client = await self._get_client()
        try:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature or LLM_TEMPERATURE,
                        "num_predict": max_tokens or LLM_MAX_TOKENS
                    }
                }
            )
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            return f"Error from Ollama: {response.status_code}"
        except Exception as e:
            logger.error(f"❌ Ollama plain generate error: {e}")
            return "Lỗi khi kết nối với Ollama."

    async def close(self):
        if self.client:
            await self.client.aclose()
            self.client = None

class GeminiProvider:
    def __init__(self):
        self.client = None
        
    def _get_config(self):
        # Import dynamically to get latest values if .env changed
        import rag_config
        return rag_config.GEMINI_API_KEY, rag_config.GEMINI_MODEL

    async def check_health(self) -> bool:
        api_key, model_name = self._get_config()
        if not api_key:
            logger.warning("⚠️ Gemini API Key is missing")
            return False
        # Simple check by listing models
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            # Try to get the model info
            model = genai.get_model(f"models/{model_name}")
            return True if model else False
        except Exception as e:
            logger.error(f"❌ Gemini health check failed: {e}")
            return False
            
    async def generate(self, query: str, context_str: str, chat_history: List[Dict], extra_context: str = None) -> str:
        api_key, _ = self._get_config()
        # ÉP BUỘC SỬ DỤNG MODEL 2.5 FLASH THEO YÊU CẦU
        model_name = "gemini-2.5-flash" 
        
        if not api_key:
            return "Chưa cấu hình Gemini API Key trong file .env."
            
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            logger.info(f"🚀 [FORCE] Sending request to Gemini ({model_name})...")
            
            # Danh sách các bản dự phòng nếu 2.5 chưa khả dụng trong SDK
            possible_models = [model_name, "gemini-2.0-flash-exp", "gemini-2.0-flash"]
            
            last_error = ""
            for model_to_try in possible_models:
                try:
                    logger.info(f"✨ Trying model: {model_to_try}")
                    model = genai.GenerativeModel(
                        model_name=model_to_try,
                        system_instruction=SYSTEM_PROMPT
                    )
                    
                    history = []
                    if chat_history:
                        for msg in chat_history[-4:]:
                            role = "model" if msg.get("role") == "bot" else "user"
                            history.append({"role": role, "parts": [msg.get("content", "")]})
                    
                    date_context = f"\n\n📅 NGÀY HIỆN TẠI: {extra_context}\n" if extra_context else ""
                    user_prompt = f"CONTEXT (Thông tin liên quan):\n{context_str}\n{date_context}\n---\nCÂU HỎI CỦA NGƯỜI DÙNG: {query}"
                    
                    chat = model.start_chat(history=history)
                    response = await asyncio.to_thread(chat.send_message, user_prompt)
                    
                    if response.text:
                        logger.info(f"✅ Success with model: {model_to_try}")
                        return response.text.strip()
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"⚠️ Model {model_to_try} failed: {last_error}")
                    continue # Thử model tiếp theo trong danh sách
            
            return f"Lỗi Gemini (Đã thử mọi cách với 2.5 Flash): {last_error}"
            
        except Exception as e:
            logger.error(f"❌ Gemini generate error: {str(e)}")
            return f"Lỗi hệ thống Gemini: {str(e)}"

    async def generate_plain(self, prompt: str, temperature: float = None, max_tokens: int = None) -> str:
        api_key, _ = self._get_config()
        # ÉP BUỘC SỬ DỤNG 2.5 FLASH
        model_name = "gemini-2.5-flash" 
        
        if not api_key:
            return "Chưa cấu hình Gemini API Key trong file .env."
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            # Danh sách thử nghiệm tương tự như generate()
            possible_models = [model_name, "gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini-1.5-flash"]
            
            last_error = ""
            for model_to_try in possible_models:
                try:
                    model = genai.GenerativeModel(model_name=model_to_try)
                    config = genai.types.GenerationConfig(
                        temperature=temperature or LLM_TEMPERATURE,
                        max_output_tokens=max_tokens or LLM_MAX_TOKENS
                    )
                    
                    logger.info(f"🚀 [FORCE-PLAIN] Sending request to Gemini ({model_to_try})...")
                    response = await asyncio.to_thread(model.generate_content, prompt, generation_config=config)
                    
                    if response.text:
                        return response.text.strip()
                except Exception as e:
                    last_error = str(e)
                    continue
            
            return f"Lỗi Gemini Plain: {last_error}"
        except Exception as e:
            logger.error(f"❌ Gemini plain generate error: {str(e)}")
            return f"Lỗi hệ thống Gemini: {str(e)}"

    async def close(self):
        pass

class LLMGenerator:
    """
    Orchestrator class for LLM generation
    """
    def __init__(self):
        self.providers = {
            "ollama": OllamaProvider(),
            "gemini": GeminiProvider()
        }
        
    def _get_provider(self):
        provider_name = get_active_llm_provider()
        return self.providers.get(provider_name, self.providers["ollama"])
    
    async def check_health(self) -> bool:
        return await self._get_provider().check_health()
    
    async def generate(self, query: str, context_docs: List[Dict], chat_history: List[Dict] = None, extra_context: str = None, **kwargs) -> str:
        # Build context string
        context_parts = []
        for i, doc in enumerate(context_docs, 1):
            content = doc.get('content', '')
            metadata = doc.get('metadata', {})
            source_type = metadata.get('source_type', 'unknown')
            score = doc.get('score', 0)
            context_parts.append(f"[{i}] (Nguồn: {source_type}, Độ liên quan: {score:.2f})\n{content}")
        
        context_str = "\n\n---\n\n".join(context_parts) if context_parts else "Không có thông tin liên quan."
        
        provider = self._get_provider()
        logger.info(f"🤖 Using LLM Provider: {get_active_llm_provider().upper()}")
        
        return await provider.generate(query, context_str, chat_history, extra_context)

    async def generate_plain(self, prompt: str, temperature: float = None, max_tokens: int = None) -> str:
        """Generic text generation without RAG context"""
        provider = self._get_provider()
        logger.info(f"🤖 Plain Generation using Provider: {get_active_llm_provider().upper()}")
        return await provider.generate_plain(prompt, temperature, max_tokens)

    async def close(self):
        for provider in self.providers.values():
            await provider.close()

# Singleton instance
llm_generator = LLMGenerator()
