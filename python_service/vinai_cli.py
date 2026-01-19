import argparse
import os
import time
import torch
import whisper

# Model Whisper tiếng Việt
DEFAULT_MODEL = "large-v3"

# Prompt tiếng Việt giúp model định hình cách viết hoa và ngắt câu
VIETNAMESE_PROMPT = "Xin chào các bạn. Đây là bản ghi chép chính xác, có đầy đủ dấu chấm, dấu phẩy. Tên riêng như Hà Nội, Hồ Chí Minh, VinAI đều được viết hoa chuẩn xác."

def check_cuda_available():
    """Kiểm tra CUDA có sẵn không"""
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        device_name = torch.cuda.get_device_name(0)
        print(f"--- 🎮 CUDA Available: {device_count} device(s) ---")
        print(f"--- 🎮 GPU: {device_name} ---")
        return True
    else:
        print("--- ⚠️ CUDA NOT Available - Will use CPU ---")
        return False

def main():
    parser = argparse.ArgumentParser(description="Vietnamese Speech-to-Text (Whisper)")
    parser.add_argument("input_file", help="Path to audio file")
    parser.add_argument("-o", "--output", help="Output file path (default: stdout)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Whisper model (default: {DEFAULT_MODEL})")
    parser.add_argument("--device", default="cuda", help="Device: cuda or cpu (default: cuda)")
    parser.add_argument("--beam_size", type=int, default=5, help="Beam size for decoding (default: 5)")
    
    args = parser.parse_args()

    if not os.path.exists(args.input_file):
        print(f"❌ File not found: {args.input_file}")
        return

    # Kiểm tra GPU
    if args.device == "cuda":
        if not check_cuda_available():
            print("--- ⚠️ Falling back to CPU ---")
            args.device = "cpu"

    print(f"--- 🚀 Loading Model: {args.model} on {args.device.upper()} ---")
    
    try:
        model = whisper.load_model(args.model, device=args.device)
        print(f"--- ✅ Model loaded successfully on {args.device.upper()} ---")
    except Exception as e:
        print(f"--- ❌ Failed to load model: {e} ---")
        return

    print(f"--- ⚡ Processing: {args.input_file} ---")
    start_time = time.time()
    
    # Transcribe với cấu hình tối ưu cho tiếng Việt
    result = model.transcribe(
        args.input_file,
        language="vi",
        initial_prompt=VIETNAMESE_PROMPT,
        beam_size=args.beam_size
    )

    text = result["text"].strip()
    processing_time = time.time() - start_time

    # Output
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"\n--- ✅ Done! Saved to: {args.output} ---")
    else:
        print("\n--- ✅ Result: ---")
        print(text)
    
    print(f"\n⏱️  Processing time: {processing_time:.1f}s")

if __name__ == "__main__":
    main()
