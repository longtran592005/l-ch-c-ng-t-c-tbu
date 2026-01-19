import argparse
import os
import time
from faster_whisper import WhisperModel, BatchedInferencePipeline
from tqdm import tqdm

# Model VinAI
DEFAULT_MODEL = "suzii/vi-whisper-large-v3-turbo-v1-ct2"

# Mẹo: Câu prompt giúp model định hình cách viết hoa và ngắt câu
# Chứa: Tên riêng, Địa danh, Dấu chấm, Dấu phẩy, Dấu hỏi.
VIETNAMESE_PROMPT = "Xin chào các bạn. Đây là bản ghi chép chính xác, có đầy đủ dấu chấm, dấu phẩy. Tên riêng như Hà Nội, Hồ Chí Minh, VinAI đều được viết hoa chuẩn xác."

def format_timestamp(seconds):
    whole_seconds = int(seconds)
    milliseconds = int((seconds - whole_seconds) * 1000)
    hours = whole_seconds // 3600
    minutes = (whole_seconds % 3600) // 60
    seconds = whole_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def main():
    parser = argparse.ArgumentParser(description="Vietnamese Speech-to-Text (Fix Punctuation & Capitalization)")
    parser.add_argument("input_file", help="Path to audio file")
    parser.add_argument("-o", "--output", help="Output file path")
    parser.add_argument("--batch_size", type=int, default=8, help="Lower batch size helps accuracy slightly")
    parser.add_argument("--device", default="cuda", help="cuda or cpu")
    parser.add_argument("--beam_size", type=int, default=5, help="Higher beam size (5) improves punctuation accuracy")
    
    args = parser.parse_args()

    if not os.path.exists(args.input_file):
        print(f"❌ File not found: {args.input_file}")
        return

    if not args.output:
        args.output = os.path.splitext(args.input_file)[0] + ".txt"

    print(f"--- 🚀 Loading Model: {DEFAULT_MODEL} ---")
    
    try:
        model = WhisperModel(DEFAULT_MODEL, device=args.device, compute_type="float16")
        batched_model = BatchedInferencePipeline(model=model)
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    print(f"--- ⚡ Processing with Prompt Context ---")
    start_time = time.time()
    
    # THAY ĐỔI QUAN TRỌNG:
    # 1. beam_size=5: Tìm kiếm kỹ hơn để đặt dấu câu đúng.
    # 2. initial_prompt: Ép model tuân thủ quy tắc viết hoa.
    segments, info = batched_model.transcribe(
        args.input_file, 
        batch_size=args.batch_size, 
        beam_size=args.beam_size, 
        initial_prompt=VIETNAMESE_PROMPT
    )

    print(f"    Language: {info.language}")

    with open(args.output, "w", encoding="utf-8") as f:
        with tqdm(total=round(info.duration), unit="sec") as pbar:
            last_pos = 0
            for segment in segments:
                text = segment.text.strip()
                
                # Logic nhỏ: Nếu câu trước kết thúc bằng dấu câu, câu sau nên viết hoa (Whisper thường tự làm, nhưng check thêm cho chắc)
                if text and not text[0].isupper():
                     text = text[0].upper() + text[1:]

                # line = f"[{format_timestamp(segment.start)} -> {format_timestamp(segment.end)}] {text}\n"
                line = f"{text}\n"
                f.write(line)
                
                pbar.update(round(segment.end - last_pos))
                last_pos = segment.end

    print(f"\n--- ✅ Done! Saved to: {args.output} ---")

if __name__ == "__main__":
    main()
