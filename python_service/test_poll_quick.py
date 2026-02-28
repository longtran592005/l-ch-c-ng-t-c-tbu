"""Quick test Pollinations via RAG"""
import httpx, asyncio, json, time

async def test():
    client = httpx.AsyncClient(verify=False, timeout=120)
    r = await client.post("https://localhost:8002/llm/switch", json={"provider": "pollinations"})
    print("Switch:", r.json())
    
    t0 = time.time()
    r = await client.post("https://localhost:8002/chat", json={
        "message": "ngày 27 tháng 1 năm 2026 có lịch gì không",
        "session_id": "test_poll_v4",
        "chat_history": []
    })
    elapsed = time.time() - t0
    data = r.json()
    answer = data.get("answer", "")
    print(f"Time: {elapsed:.1f}s")
    print(f"Answer ({len(answer)} chars): {answer[:500]}")
    print(f"Sources: {data.get('num_retrieved', 0)}")
    if not answer:
        print("FULL RESPONSE:")
        print(json.dumps(data, ensure_ascii=False, indent=2)[:2000])
    await client.aclose()

asyncio.run(test())
