"""Debug Pollinations through the actual RAG LLM Generator"""
import asyncio
import sys
import os
import json
import logging

# Setup logging to see everything
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rag'))

from rag.llm_generator import PollinationsProvider, LLM_MAX_TOKENS, LLM_TEMPERATURE, SYSTEM_PROMPT
from rag_config import POLLINATIONS_API_KEY, POLLINATIONS_MODEL, POLLINATIONS_BASE_URL

async def test():
    print(f"Config: model={POLLINATIONS_MODEL}, url={POLLINATIONS_BASE_URL}")
    print(f"Key: {POLLINATIONS_API_KEY[:15]}... ({len(POLLINATIONS_API_KEY)} chars)")
    print(f"LLM_MAX_TOKENS: {LLM_MAX_TOKENS}")
    print(f"LLM_TEMPERATURE: {LLM_TEMPERATURE}")
    print(f"SYSTEM_PROMPT length: {len(SYSTEM_PROMPT)} chars")
    print()
    
    provider = PollinationsProvider()
    
    # Simulate what the RAG chain sends
    context_str = """[1] (Nguồn: schedule, Độ liên quan: 1.00)
Lịch công tác Trường Đại học Thái Bình - Tuần 05 (Từ 26/01/2026 đến 01/02/2026)

📅 Ngày 27/01/2026 (Thứ Ba):

🕐 08:00 - 09:00
📋 Nội dung: Họp Ban Giám hiệu
📍 Địa điểm: Phòng Hội thảo
👥 Thành phần: Ban Giám hiệu, Chánh Văn phòng, đ/c Bắc (TCCB, TT&KĐCL), đ/c Lệ (ĐT&HSSV), đ/c Hương (KHCN&HTPT), TKHT, TLHT

🕐 14:00 - 15:00  
📋 Nội dung: Gặp mặt giảng viên (Nam từ 46, Nữ từ 44 tuổi trở xuống tính từ năm 2026)
📍 Địa điểm: Phòng F118
👥 Thành phần: Theo giấy mời

---

[2] (Nguồn: schedule, Độ liên quan: 0.72)
Lịch công tác Trường Đại học Thái Bình - Tuần 05

📅 Ngày 26/01/2026 (Thứ Hai):
🕐 09:00 - 11:00
📋 Nội dung: Hội nghị tổng kết
📍 Địa điểm: Hội trường A"""

    query = "ngày 27 tháng 1 năm 2026 có lịch gì không"
    extra_context = "Hôm nay là Thứ Sáu, ngày 27/02/2026"
    chat_history = []
    
    print("=" * 60)
    print("Calling PollinationsProvider.generate()...")
    print(f"Query: {query}")
    print(f"Context length: {len(context_str)} chars")
    print("=" * 60)
    
    # Build the same messages as the provider does
    import httpx
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    date_context = f"\n\n📅 NGÀY HIỆN TẠI: {extra_context}\n"
    user_prompt = f"CONTEXT (Thông tin liên quan):\n{context_str}\n{date_context}\n---\nCÂU HỏI CỦA NGƯỜI DÙNG: {query}\n\n[⚠️ TRẢ LỜI BẰNG TIẾNG VIỆT - KHÔNG DÙNG TIẾNG TRUNG]"
    messages.append({"role": "user", "content": user_prompt})
    
    # Count tokens approximately
    total_chars = sum(len(m['content']) for m in messages)
    print(f"\nTotal message chars: {total_chars}")
    print(f"Approximate tokens: ~{total_chars // 3}")
    print()
    
    # Direct API call with the exact same payload
    client = httpx.AsyncClient(timeout=120)
    headers = {"Content-Type": "application/json"}
    if POLLINATIONS_API_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_API_KEY}"
    
    payload = {
        "model": POLLINATIONS_MODEL,
        "messages": messages,
        "temperature": LLM_TEMPERATURE,
        "max_tokens": LLM_MAX_TOKENS,
        "stream": False
    }
    
    print(f"Sending to: {POLLINATIONS_BASE_URL}/v1/chat/completions")
    print(f"Model: {POLLINATIONS_MODEL}")
    print(f"Max tokens: {LLM_MAX_TOKENS}")
    print(f"Temperature: {LLM_TEMPERATURE}")
    
    response = await client.post(
        f"{POLLINATIONS_BASE_URL}/v1/chat/completions",
        headers=headers,
        json=payload
    )
    
    print(f"\nResponse status: {response.status_code}")
    data = response.json()
    
    if response.status_code == 200:
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        finish = data.get("choices", [{}])[0].get("finish_reason", "")
        model_used = data.get("model", "")
        print(f"Model used: {model_used}")
        print(f"Finish reason: {finish}")
        print(f"Content length: {len(content)}")
        print(f"Content: {content[:500]}")
        
        if not content:
            print("\n⚠️ EMPTY CONTENT! Full response:")
            print(json.dumps(data, ensure_ascii=False, indent=2)[:2000])
    else:
        print(f"Error: {response.text[:500]}")
    
    # Try again with higher max_tokens
    if not data.get("choices", [{}])[0].get("message", {}).get("content", ""):
        print("\n\n--- Retrying with max_tokens=4096 ---")
        payload["max_tokens"] = 4096
        response = await client.post(
            f"{POLLINATIONS_BASE_URL}/v1/chat/completions",
            headers=headers,
            json=payload
        )
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        finish = data.get("choices", [{}])[0].get("finish_reason", "")
        print(f"Finish: {finish}, Content ({len(content)}): {content[:300]}")
    
    await client.aclose()

asyncio.run(test())
