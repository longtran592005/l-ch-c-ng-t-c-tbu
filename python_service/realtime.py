"""
Real-time Transcription Service
Supports streaming audio chunks for live transcription
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional
from fastapi import UploadFile, WebSocket, WebSocketDisconnect
import torch
import numpy as np
import io
import wave

from vinai import load_model, transcribe_audio
from config import WHISPER_SIZE

logger = logging.getLogger(__name__)

# Real-time transcription configuration
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION_MS = 3000  # 3 seconds per chunk
CHUNK_SAMPLES = SAMPLE_RATE * (CHUNK_DURATION_MS // 1000)

class RealtimeTranscriber:
    """Real-time transcription with chunked processing"""

    def __init__(self, model_size: str = WHISPER_SIZE):
        self.model_size = model_size
        self.model = None
        self.audio_buffer = []
        self._load_model()

    def _load_model(self):
        """Load Whisper model for real-time transcription"""
        try:
            # Use smaller model for real-time
            model_name = "tiny" if self.model_size in ["tiny", "base"] else "base"
            logger.info(f"🔄 Loading Whisper model for realtime: {model_name}")
            
            self.model = load_model()
            
            logger.info(f"✅ Realtime transcription model loaded: {model_name}")
        except Exception as e:
            logger.error(f"❌ Failed to load realtime model: {e}")
            raise

    def add_audio_chunk(self, audio_data: bytes):
        """
        Add audio chunk to buffer
        
        Args:
            audio_data: Raw audio bytes (PCM 16-bit, 16kHz, mono)
        """
        self.audio_buffer.append(audio_data)
        
    async def process_chunks(self) -> AsyncGenerator[str, None]:
        """
        Process audio chunks and yield transcribed text
        
        Yields:
            Transcribed text for each chunk
        """
        while True:
            if self._has_enough_audio():
                audio_chunk = self._get_audio_chunk()
                if audio_chunk is not None:
                    text = await self._transcribe_chunk(audio_chunk)
                    if text and text.strip():
                        yield text
                
                await asyncio.sleep(0.1)
            else:
                await asyncio.sleep(0.05)

    def _has_enough_audio(self) -> bool:
        """Check if buffer has enough audio for a chunk"""
        total_samples = sum(len(chunk) // 2 for chunk in self.audio_buffer)  # 16-bit = 2 bytes per sample
        return total_samples >= CHUNK_SAMPLES

    def _get_audio_chunk(self) -> Optional[bytes]:
        """
        Get audio chunk from buffer
        
        Returns:
            Audio chunk bytes or None if not enough data
        """
        total_samples = sum(len(chunk) // 2 for chunk in self.audio_buffer)
        
        if total_samples < CHUNK_SAMPLES:
            return None
        
        # Concatenate audio chunks
        all_audio = b''.join(self.audio_buffer)
        
        # Extract required samples
        chunk_bytes = all_audio[:CHUNK_SAMPLES * 2]
        
        # Remove processed audio from buffer
        remaining = all_audio[CHUNK_SAMPLES * 2:]
        self.audio_buffer = [remaining] if remaining else []
        
        return chunk_bytes

    async def _transcribe_chunk(self, audio_bytes: bytes) -> Optional[str]:
        """
        Transcribe a single audio chunk
        
        Args:
            audio_bytes: Audio chunk bytes
            
        Returns:
            Transcribed text or None
        """
        try:
            # Convert bytes to numpy array
            audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Save to temp file for Whisper
            temp_file = f"temp_chunk_{asyncio.get_event_loop().time()}.wav"
            with wave.open(temp_file, 'wb') as wf:
                wf.setnchannels(CHANNELS)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(SAMPLE_RATE)
                wf.writeframes(audio_bytes)
            
            # Transcribe
            text = transcribe_audio(temp_file, batch_size=1, beam_size=1)
            
            # Clean up
            import os
            if os.path.exists(temp_file):
                os.remove(temp_file)
            
            return text.strip() if text else None
            
        except Exception as e:
            logger.error(f"Error transcribing chunk: {e}")
            return None

    def flush_buffer(self) -> Optional[str]:
        """
        Process remaining audio in buffer
        
        Returns:
            Transcribed text or None
        """
        if not self.audio_buffer:
            return None
        
        # Concatenate all remaining audio
        all_audio = b''.join(self.audio_buffer)
        
        if len(all_audio) < 1000:  # Too short
            self.audio_buffer = []
            return None
        
        # Process
        result = asyncio.run(self._transcribe_chunk(all_audio))
        self.audio_buffer = []
        
        return result


# WebSocket endpoint for real-time transcription
transcriber_instance = None

async def websocket_realtime_transcription(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transcription
    
    Client should send audio chunks in binary format.
    Server responds with transcribed text.
    """
    global transcriber_instance
    
    await websocket.accept()
    logger.info("🎤 Real-time transcription client connected")
    
    try:
        # Initialize transcriber if not exists
        if transcriber_instance is None:
            transcriber_instance = RealtimeTranscriber()
        
        # Send ready signal
        await websocket.send_json({
            "status": "ready",
            "sample_rate": SAMPLE_RATE,
            "channels": CHANNELS,
            "chunk_duration_ms": CHUNK_DURATION_MS
        })
        
        # Process audio chunks
        while True:
            # Receive audio chunk
            audio_data = await websocket.receive_bytes()
            
            # Add to buffer
            transcriber_instance.add_audio_chunk(audio_data)
            
            # Process if enough audio
            if transcriber_instance._has_enough_audio():
                chunk = transcriber_instance._get_audio_chunk()
                if chunk:
                    text = await transcriber_instance._transcribe_chunk(chunk)
                    
                    if text:
                        await websocket.send_json({
                            "type": "transcription",
                            "text": text,
                            "timestamp": asyncio.get_event_loop().time()
                        })
                    
                    await websocket.send_json({
                        "type": "ack",
                        "processed_bytes": len(chunk)
                    })
            
    except WebSocketDisconnect:
        logger.info("🎤 Real-time transcription client disconnected")
        
        # Flush remaining buffer
        if transcriber_instance:
            remaining_text = transcriber_instance.flush_buffer()
            if remaining_text:
                try:
                    await websocket.send_json({
                        "type": "final",
                        "text": remaining_text
                    })
                except:
                    pass
    
    except Exception as e:
        logger.error(f"❌ Real-time transcription error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


def convert_webm_to_wav(webm_data: bytes) -> bytes:
    """
    Convert WebM audio to WAV format
    
    Args:
        webm_data: WebM audio bytes
        
    Returns:
        WAV audio bytes
    """
    try:
        import tempfile
        import subprocess
        
        # Save WebM to temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as webm_file:
            webm_file.write(webm_data)
            webm_path = webm_file.name
        
        # Convert to WAV
        wav_path = webm_path.replace(".webm", ".wav")
        subprocess.run([
            "ffmpeg", "-i", webm_path,
            "-ar", str(SAMPLE_RATE),
            "-ac", str(CHANNELS),
            "-f", "wav",
            wav_path
        ], check=True, capture_output=True)
        
        # Read WAV
        with open(wav_path, 'rb') as wav_file:
            wav_data = wav_file.read()
        
        # Clean up
        import os
        os.remove(webm_path)
        os.remove(wav_path)
        
        return wav_data
        
    except Exception as e:
        logger.error(f"Error converting WebM to WAV: {e}")
        raise
