import os
import time
from faster_whisper import WhisperModel, BatchedInferencePipeline
from tqdm import tqdm

# Model VinAI configuration
# Using the model specified in user's whisper/vinai.py
DEFAULT_MODEL = "suzii/vi-whisper-large-v3-turbo-v1-ct2"

# Prompt from user's whisper/vinai.py
VIETNAMESE_PROMPT = "Xin chào các bạn. Đây là bản ghi chép chính xác, có đầy đủ dấu chấm, dấu phẩy. Tên riêng như Hà Nội, Hồ Chí Minh, VinAI đều được viết hoa chuẩn xác."

# Global model cache
model = None
batched_model = None

def load_model(device="cuda", compute_type="float16"):
    """
    Load Whisper model and return batched pipeline.
    Implements singleton pattern.
    """
    global model, batched_model
    if batched_model is not None:
        return batched_model
    
    print(f"--- 🚀 Loading Model: {DEFAULT_MODEL} ---")
    
    try:
        # Try loading with specified device
        model = WhisperModel(DEFAULT_MODEL, device=device, compute_type=compute_type)
        batched_model = BatchedInferencePipeline(model=model)
        print(f"--- ✅ Model loaded successfully on {device} ---")
    except Exception as e:
        print(f"--- ⚠️ Error loading model on {device}: {e} ---")
        if device == "cuda":
            print("--- 🔄 Retrying on CPU (int8)... ---")
            try:
                # Fallback to CPU
                model = WhisperModel(DEFAULT_MODEL, device="cpu", compute_type="int8")
                batched_model = BatchedInferencePipeline(model=model)
                print("--- ✅ Model loaded on CPU ---")
            except Exception as e2:
                print(f"--- ❌ Failed to load model on CPU: {e2} ---")
                raise e2
        else:
            raise e

    return batched_model

def transcribe_audio(audio_path: str, batch_size: int = 4, beam_size: int = 5) -> str:
    """
    Transcribe audio file to Vietnamese text.
    
    Args:
        audio_path: Path to audio file
        batch_size: Batch size for inference
        beam_size: Beam size for better accuracy
        
    Returns:
        Full transcribed text
    """
    pipeline = load_model()
    
    print(f"--- ⚡ Processing with Prompt Context ---")
    
    # Run transcription
    segments, info = pipeline.transcribe(
        audio_path, 
        batch_size=batch_size, 
        beam_size=beam_size, 
        initial_prompt=VIETNAMESE_PROMPT
    )

    print(f"    Language detected: {info.language}")
    
    full_text = []
    
    for segment in segments:
        text = segment.text.strip()
        
        # Logic: If previous sentence ends with punctuation, next should be capitalized.
        # Use simple heuristic: Capitalize first letter if not already
        if text and not text[0].isupper():
             text = text[0].upper() + text[1:]
        
        full_text.append(text)
        
    return " ".join(full_text)
