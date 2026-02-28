"""Reproduce exact RAG pipeline context for Pollinations debug"""
import httpx, asyncio, json, time, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rag'))

from rag.llm_generator import SYSTEM_PROMPT, LLM_MAX_TOKENS, LLM_TEMPERATURE
from rag_config import POLLINATIONS_API_KEY, POLLINATIONS_MODEL, POLLINATIONS_BASE_URL

# Exact context from RAG sources
context_parts = [
    '[1] (Nguồn: schedule, Độ liên quan: 1.00)\nLịch công tác ngày 27/01/2026 (Thứ Ba)\nThời gian: 08:00 - 09:00\nNội dung: Họp Ban Giám hiệu, từ 8h00\nĐịa điểm: Phòng Hội thảo\nChủ trì: Ban Giám hiệu\nThành phần tham dự: Ban Giám hiệu, Chánh Văn phòng, đ/c Bắc (TCCB, TT&KĐCL), đ/c Lệ (ĐT&HSSV), đ/c Hương KHCN&HTPT), TKHT, TLHT\nĐơn vị chuẩn bị: -',
    '[2] (Nguồn: schedule, Độ liên quan: 1.00)\nLịch công tác ngày 27/01/2026 (Thứ Ba)\nThời gian: 14:00 - 15:00\nNội dung: Gặp mặt giảng viên (Nam từ 46, Nữ từ 44 tuổi trở xuống tính từ năm 2026), từ 14h00\nĐịa điểm: Phòng F118\nChủ trì: Hiệu trưởng\nThành phần tham dự: Ban Giám hiệu, Bí thư Chi bộ, Trưởng các đơn vị và giảng viên (Nam từ 46, Nữ từ 44 tuổi trở xuống tính từ năm 2026)'
]

context_str = "\n\n---\n\n".join(context_parts)
query = "ngày 27 tháng 1 năm 2026 có lịch gì không"
extra_context = "Hôm nay là Thứ Sáu, ngày 27/02/2026"

async def test():
    client = httpx.AsyncClient(timeout=120)
    
    # Build same messages as PollinationsProvider.generate()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    date_context = f"\n\n📅 NGÀY HIỆN TẠI: {extra_context}\n"
    user_prompt = f"CONTEXT (Thông tin liên quan):\n{context_str}\n{date_context}\n---\nCÂU HỎI CỦA NGƯỜI DÙNG: {query}\n\n[⚠️ TRẢ LỜI BẰNG TIẾNG VIỆT - KHÔNG DÙNG TIẾNG TRUNG]"
    messages.append({"role": "user", "content": user_prompt})
    
    total_chars = sum(len(m['content']) for m in messages)
    print(f"Total chars: {total_chars}")
    print(f"System prompt: {len(SYSTEM_PROMPT)} chars")
    print(f"User prompt: {len(user_prompt)} chars")
    print(f"Context str: {len(context_str)} chars")
    print(f"Max tokens: {LLM_MAX_TOKENS}, Temp: {LLM_TEMPERATURE}")
    
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
    
    # Test 1: Exact same as RAG would send
    print("\n--- Test 1: Exact RAG payload ---")
    r = await client.post(f"{POLLINATIONS_BASE_URL}/v1/chat/completions", headers=headers, json=payload)
    data = r.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    finish = data.get("choices", [{}])[0].get("finish_reason", "")
    print(f"Status: {r.status_code}, Finish: {finish}, Content ({len(content)}): {content[:300]}")
    if not content:
        print(f"Full choices: {json.dumps(data.get('choices', []), ensure_ascii=False)[:500]}")
    
    # Test 2: Higher max_tokens
    print("\n--- Test 2: max_tokens=4096 ---")
    payload["max_tokens"] = 4096
    r = await client.post(f"{POLLINATIONS_BASE_URL}/v1/chat/completions", headers=headers, json=payload)
    data = r.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    finish = data.get("choices", [{}])[0].get("finish_reason", "")
    print(f"Status: {r.status_code}, Finish: {finish}, Content ({len(content)}): {content[:300]}")
    
    # Test 3: Without max_tokens
    print("\n--- Test 3: No max_tokens ---")
    del payload["max_tokens"]
    r = await client.post(f"{POLLINATIONS_BASE_URL}/v1/chat/completions", headers=headers, json=payload)
    data = r.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    finish = data.get("choices", [{}])[0].get("finish_reason", "")
    print(f"Status: {r.status_code}, Finish: {finish}, Content ({len(content)}): {content[:300]}")
    
    await client.aclose()

asyncio.run(test())
