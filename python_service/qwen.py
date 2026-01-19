"""
Qwen 2.5 Instruct Model Integration for Meeting Analysis
Supports: Summary, Meeting Minutes, Action Items Extraction, Deep Analysis
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from typing import Dict, List, Optional
import json
import logging

logger = logging.getLogger(__name__)

# Model configuration
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"

# System prompts for different tasks
SYSTEM_PROMPTS = {
    "summary": """Bạn là trợ lý AI chuyên nghiệp chuyên tóm tắt nội dung cuộc họp.
Nhiệm vụ: Tóm tắt ngắn gọn, súc tích các điểm chính của cuộc họp.
Yêu cầu:
- Tóm tắt trong 3-5 đoạn
- Nêu rõ mục tiêu chính
- Liệt kê các quyết định quan trọng
- Giọng văn chuyên nghiệp, khách quan""",

    "minutes": """Bạn là thư ký chuyên nghiệp có kinh nghiệm soạn thảo biên bản cuộc họp.
Nhiệm vụ: Tạo biên bản cuộc họp đầy đủ, có cấu trúc rõ ràng.
Cấu trúc biên bản:
1. THÔNG TIN CHUNG
   - Tên cuộc họp
   - Thời gian, địa điểm
   - Thành phần tham dự
2. NỘI DUNG CUỘC HỌP
   - Các mục thảo luận chính
   - Quan điểm và tranh luận
3. QUYẾT ĐỊNH
   - Các quyết định đã thông qua
   - Kết quả biểu quyết (nếu có)
4. HÀNH ĐỘNG CẦN LÀM
   - Các công việc cần thực hiện
   - Người phụ trách
   - Thời hạn hoàn thành
5. LỊCH TRÌNH TIẾP THEO
   - Cuộc họp tiếp theo (nếu có)
Yêu cầu: Ngôn ngữ trang trọng, chính xác, đầy đủ thông tin.""",

    "action_items": """Bạn là trợ lý quản lý dự án chuyên nghiệp.
Nhiệm vụ: Trích xuất các hành động cần làm từ nội dung cuộc họp.
Yêu cầu:
- Nhận dạng rõ: Việc cần làm, người phụ trách, deadline
- Format JSON:
  {
    "action_items": [
      {
        "task": "Mô tả công việc",
        "assignee": "Người phụ trách",
        "deadline": "Ngày giờ hoặc null",
        "priority": "high/medium/low",
        "notes": "Ghi chú bổ sung"
      }
    ]
  }
- Chỉ trả về JSON, không có văn bản khác""",

    "deep_analysis": """Bạn là nhà phân tích kinh doanh chuyên nghiệp.
Nhiệm vụ: Phân tích sâu nội dung cuộc họp.
Phân tích các khía cạnh:
1. MỤC TIÊU VÀ PHẠM VI
   - Mục tiêu cuộc họp có rõ ràng không?
   - Các vấn đề đã được thảo luận đủ chưa?

2. THAM GIA
   - Thành phần tham dự có phù hợp không?
   - Ai đóng góp tích cực nhất?

3. VẤN ĐỀ VÀ THÁCH THỨC
   - Các trở ngại chính
   - Rủi ro tiềm ẩn

4. QUYẾT ĐỊNH VÀ HƯỚNG GIẢI QUYẾT
   - Các quyết định đã đạt
   - Phương án giải quyết

5. ĐỀ XUẤT
   - Cải tiến cho cuộc họp tiếp theo
   - Hành động theo dõi

Yêu cầu: Phân tích chuyên nghiệp, chi tiết, có cơ sở.""",

    "meeting_insights": """Bạn là nhà phân tích dữ liệu cuộc họp chuyên nghiệp.
Nhiệm vụ: Phân tích và tổng hợp thông tin chi tiết về cuộc họp.
Yêu cầu:
- Phân tích tâm trạng và thái độ tham gia
- Xác định các vấn đề tranh luận
- Tìm kiếm các cơ hội và thách thức
- Đánh giá hiệu quả cuộc họp
- Format: Markdown với các tiêu đề rõ ràng"""
}

class QwenModel:
    """Qwen 2.5 Model Manager with quantization support"""

    def __init__(self, model_name: str = DEFAULT_MODEL, device: Optional[str] = None):
        self.model_name = model_name
        self.device = device or self._detect_device()
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _detect_device(self) -> str:
        """Detect available device (CUDA > CPU)"""
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            device_name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
            
            logger.info(f"🎮 CUDA Available: {device_count} device(s)")
            logger.info(f"🎮 GPU: {device_name}")
            logger.info(f"🎮 VRAM: {vram:.1f}GB")
            
            return "cuda"
        else:
            logger.info("⚠️ CUDA NOT Available - Using CPU")
            return "cpu"

    def _load_model(self):
        """Load Qwen model with appropriate quantization"""
        if self.model is not None:
            return self.model

        try:
            logger.info(f"🚀 Loading Qwen Model: {self.model_name}")

            # Configure quantization for CUDA
            quantization_config = None
            if self.device == "cuda":
                # 4-bit quantization for memory efficiency
                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4"
                )
                logger.info("📦 Using 4-bit quantization (NF4)")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )

            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                quantization_config=quantization_config,
                device_map="auto" if self.device == "cuda" else None,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                trust_remote_code=True
            )

            logger.info(f"✅ Qwen Model loaded successfully on {self.device.upper()}")

        except Exception as e:
            logger.error(f"❌ Failed to load Qwen model: {e}")
            raise

    def _generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_new_tokens: int = 2048,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> str:
        """Generate response from Qwen model"""
        try:
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            # Apply chat template
            text = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )

            # Tokenize
            inputs = self.tokenizer(
                [text],
                return_tensors="pt",
                padding=True
            ).to(self.model.device)

            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )

            # Decode
            response = self.tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:],
                skip_special_tokens=True
            )

            return response.strip()

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise

    def generate_summary(self, meeting_content: str) -> str:
        """Generate meeting summary"""
        system_prompt = SYSTEM_PROMPTS["summary"]
        prompt = f"""Tóm tắt cuộc họp sau:

{meeting_content}

Tóm tắt:"""

        return self._generate_response(
            prompt,
            system_prompt=system_prompt,
            max_new_tokens=1024,
            temperature=0.6
        )

    def generate_minutes(self, meeting_content: str, additional_info: Optional[Dict] = None) -> str:
        """Generate meeting minutes with structure"""
        system_prompt = SYSTEM_PROMPTS["minutes"]

        # Add additional info if provided
        prompt = f"""Tạo biên bản cho cuộc họp sau:"""
        
        if additional_info:
            prompt += f"""
THÔNG TIN CƠ BẢN:
- Tên cuộc họp: {additional_info.get('title', 'Không rõ')}
- Ngày giờ: {additional_info.get('meeting_date', 'Không rõ')}
- Địa điểm: {additional_info.get('location', 'Không rõ')}
- Người điều hành: {additional_info.get('leader', 'Không rõ')}
"""

        prompt += f"""

NỘI DUNG CUỘC HỌP:
{meeting_content}

Biên bản:"""

        return self._generate_response(
            prompt,
            system_prompt=system_prompt,
            max_new_tokens=3072,
            temperature=0.7
        )

    def extract_action_items(self, meeting_content: str) -> Dict:
        """Extract action items from meeting"""
        system_prompt = SYSTEM_PROMPTS["action_items"]
        prompt = f"""Trích xuất các hành động cần làm từ nội dung cuộc họp:

{meeting_content}

Action items (JSON format):"""

        response = self._generate_response(
            prompt,
            system_prompt=system_prompt,
            max_new_tokens=1536,
            temperature=0.5
        )

        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                logger.warning("No valid JSON found in response")
                return {"action_items": []}

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {e}")
            return {"action_items": []}

    def deep_analysis(self, meeting_content: str) -> str:
        """Perform deep analysis of meeting content"""
        system_prompt = SYSTEM_PROMPTS["deep_analysis"]
        prompt = f"""Phân tích sâu nội dung cuộc họp sau:

{meeting_content}

Phân tích chi tiết:"""

        return self._generate_response(
            prompt,
            system_prompt=system_prompt,
            max_new_tokens=3072,
            temperature=0.7
        )

    def meeting_insights(self, meeting_content: str) -> str:
        """Generate meeting insights and patterns"""
        system_prompt = SYSTEM_PROMPTS["meeting_insights"]
        prompt = f"""Phân tích và tổng hợp thông tin chi tiết về cuộc họp:

{meeting_content}

Thông tin phân tích:"""

        return self._generate_response(
            prompt,
            system_prompt=system_prompt,
            max_new_tokens=2048,
            temperature=0.7
        )


# Global model instance
_qwen_model: Optional[QwenModel] = None

def load_qwen_model(model_name: str = DEFAULT_MODEL, device: Optional[str] = None) -> QwenModel:
    """Load or return cached Qwen model"""
    global _qwen_model
    if _qwen_model is None:
        _qwen_model = QwenModel(model_name, device)
    return _qwen_model

def get_qwen_model() -> Optional[QwenModel]:
    """Get current Qwen model instance"""
    return _qwen_model
