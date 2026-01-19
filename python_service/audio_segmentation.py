"""
Audio Segmentation Utilities
Chia nhỏ file audio dài thành các segments để xử lý hiệu quả hơn
"""

import os
import logging
from pathlib import Path
from typing import List, Tuple
import numpy as np
import librosa
import soundfile as sf

logger = logging.getLogger(__name__)

class AudioSegmenter:
    """
    Lớp để chia nhỏ file audio thành các segments
    Hỗ trợ nhiều phương pháp segmentation
    """

    def __init__(self, chunk_duration_minutes: float = 15, overlap_seconds: float = 2):
        """
        Args:
            chunk_duration_minutes: Độ dài mỗi segment (phút)
            overlap_seconds: Thời gian overlap giữa các segments (giây)
        """
        self.chunk_duration_minutes = chunk_duration_minutes
        self.overlap_seconds = overlap_seconds

    def get_audio_info(self, file_path: str) -> dict:
        """
        Lấy thông tin audio file
        
        Args:
            file_path: Đường dẫn tới file audio
            
        Returns:
            Dict chứa: duration, sample_rate, channels
        """
        try:
            info = sf.info(file_path)
            duration = info.duration
            samplerate = info.samplerate
            channels = info.channels
            
            logger.info(f"Audio info: {duration:.2f}s, {samplerate}Hz, {channels} channels")
            
            return {
                'duration': duration,
                'sample_rate': samplerate,
                'channels': channels,
                'file_size': os.path.getsize(file_path)
            }
        except Exception as e:
            logger.error(f"Error reading audio info: {str(e)}")
            raise

    def calculate_optimal_chunk_size(self, total_duration: float) -> Tuple[float, int]:
        """
        Tính toán kích thước chunk tối ưu dựa trên độ dài tổng
        
        Args:
            total_duration: Độ dài tổng (giây)
            
        Returns:
            Tuple (chunk_duration_minutes, num_chunks)
        """
        # Adaptive chunk size dựa trên độ dài audio
        if total_duration < 300:  # < 5 phút
            chunk_duration = 10  # 10 phút per chunk
        elif total_duration < 1800:  # < 30 phút
            chunk_duration = 12  # 12 phút per chunk
        elif total_duration < 3600:  # < 1 tiếng
            chunk_duration = 15  # 15 phút per chunk
        elif total_duration < 7200:  # < 2 tiếng
            chunk_duration = 20  # 20 phút per chunk
        else:
            chunk_duration = 25  # 25 phút per chunk (cho file rất dài)
        
        num_chunks = int(np.ceil(total_duration / (chunk_duration * 60)))
        
        logger.info(f"Optimal chunking: {chunk_duration}min chunks, {num_chunks} chunks total")
        
        return chunk_duration, num_chunks

    def split_by_duration(
        self, 
        file_path: str, 
        output_dir: str,
        chunk_duration: float = None
    ) -> List[str]:
        """
        Chia nhỏ file audio theo thời gian
        
        Args:
            file_path: File audio gốc
            output_dir: Thư mục output
            chunk_duration: Độ dài mỗi chunk (phút), None = tự động
            
        Returns:
            List đường dẫn tới các chunk files
        """
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            # Get audio info
            audio_info = self.get_audio_info(file_path)
            total_duration = audio_info['duration']
            
            # Calculate chunk size
            if chunk_duration is None:
                chunk_duration, num_chunks = self.calculate_optimal_chunk_size(total_duration)
            else:
                num_chunks = int(np.ceil(total_duration / (chunk_duration * 60)))
            
            logger.info(f"Splitting into {num_chunks} chunks of {chunk_duration}min each")
            
            # Load audio
            y, sr = librosa.load(file_path, sr=None, mono=True)
            
            chunk_files = []
            chunk_length_samples = int(chunk_duration * 60 * sr)
            overlap_samples = int(self.overlap_seconds * sr)
            
            for i in range(num_chunks):
                # Calculate start and end with overlap
                start = max(0, i * (chunk_length_samples - overlap_samples))
                end = min(len(y), start + chunk_length_samples)
                
                # Extract chunk
                chunk = y[start:end]
                
                # Save chunk
                output_filename = f"chunk_{i+1:04d}.wav"
                output_path = os.path.join(output_dir, output_filename)
                sf.write(output_path, chunk, sr)
                chunk_files.append(output_path)
                
                logger.debug(f"Created chunk {i+1}/{num_chunks}: {output_filename}")
                
                # Stop if we've processed the entire file
                if end >= len(y):
                    break
            
            logger.info(f"Successfully created {len(chunk_files)} audio chunks")
            return chunk_files
            
        except Exception as e:
            logger.error(f"Error splitting audio: {str(e)}")
            raise

    def split_by_silence(
        self,
        file_path: str,
        output_dir: str,
        min_silence_duration: float = 2.0,
        silence_threshold: float = -40.0
    ) -> List[str]:
        """
        Chia nhỏ dựa trên khoảng lặng
        
        Args:
            file_path: File audio gốc
            output_dir: Thư mục output
            min_silence_duration: Độ dài tối thiểu của khoảng lặng (giây)
            silence_threshold: Ngưỡng âm lượng (dB)
            
        Returns:
            List đường dẫn tới các chunk files
        """
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            logger.info(f"Splitting by silence (threshold: {silence_threshold}dB)")
            
            # Load audio
            y, sr = librosa.load(file_path, sr=None, mono=True)
            
            # Detect silence using librosa
            # Use energy-based silence detection
            frame_length = 2048
            hop_length = 512
            
            # Compute RMS energy
            rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)
            rms_db = librosa.amplitude_to_db(rms, ref=np.max)
            
            # Find silence segments
            is_silent = rms_db < silence_threshold
            
            # Group consecutive silent frames into segments
            silence_segments = []
            in_silence = False
            silence_start = 0
            
            for i, silent in enumerate(is_silent):
                if silent and not in_silence:
                    silence_start = i
                    in_silence = True
                elif not silent and in_silence:
                    silence_end = i
                    silence_duration = (silence_end - silence_start) * hop_length / sr
                    
                    if silence_duration >= min_silence_duration:
                        silence_segments.append((silence_start, silence_end))
                    
                    in_silence = False
            
            # Split at silence points
            chunk_files = []
            split_points = [0] + [seg[0] for seg in silence_segments] + [len(y)]
            
            for i in range(len(split_points) - 1):
                start = split_points[i]
                end = split_points[i + 1]
                
                chunk = y[start:end]
                
                if len(chunk) / sr >= 10:  # Minimum 10 seconds
                    output_filename = f"chunk_silence_{i+1:04d}.wav"
                    output_path = os.path.join(output_dir, output_filename)
                    sf.write(output_path, chunk, sr)
                    chunk_files.append(output_path)
                    logger.debug(f"Created silence-based chunk {i+1}: {output_filename}")
            
            logger.info(f"Created {len(chunk_files)} chunks using silence detection")
            return chunk_files
            
        except Exception as e:
            logger.error(f"Error splitting by silence: {str(e)}")
            raise

    def merge_transcripts(
        self,
        transcripts: List[str],
        include_timestamps: bool = False
    ) -> str:
        """
        Gộp các transcripts thành văn bản hoàn chỉnh
        
        Args:
            transcripts: List các transcript segments
            include_timestamps: Có bao gồm timestamps hay không
            
        Returns:
            Văn bản đã được gộp
        """
        if not transcripts:
            return ""
        
        merged_text = ""
        
        for i, transcript in enumerate(transcripts):
            if include_timestamps:
                merged_text += f"[Segment {i+1}]\n"
            
            merged_text += transcript.strip()
            
            # Add separator between segments
            if i < len(transcripts) - 1:
                merged_text += "\n\n"
        
        return merged_text.strip()

    def cleanup_chunks(self, output_dir: str):
        """
        Xóa các chunk files sau khi xử lý xong
        
        Args:
            output_dir: Thư mục chứa chunks
        """
        try:
            if os.path.exists(output_dir):
                for file in os.listdir(output_dir):
                    file_path = os.path.join(output_dir, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        logger.debug(f"Deleted chunk: {file}")
                
                # Try to remove directory if empty
                try:
                    os.rmdir(output_dir)
                except:
                    pass
                    
                logger.info(f"Cleaned up chunk directory: {output_dir}")
        except Exception as e:
            logger.warning(f"Error cleaning up chunks: {str(e)}")


def detect_audio_quality(file_path: str) -> dict:
    """
    Phát hiện chất lượng audio để chọn phương pháp xử lý tối ưu
    
    Args:
        file_path: Đường dẫn file audio
        
    Returns:
        Dict chứa thông tin chất lượng
    """
    try:
        y, sr = librosa.load(file_path, sr=None, mono=True)
        
        # Calculate statistics
        rms = np.sqrt(np.mean(y**2))
        peak = np.max(np.abs(y))
        
        # Convert to dB
        rms_db = 20 * np.log10(rms + 1e-6)
        peak_db = 20 * np.log10(peak + 1e-6)
        
        # Detect clipping
        clipping_ratio = np.sum(np.abs(y) > 0.99) / len(y)
        
        quality_info = {
            'rms_db': rms_db,
            'peak_db': peak_db,
            'clipping_ratio': clipping_ratio,
            'is_good_quality': clipping_ratio < 0.01 and -30 < rms_db < -10,
            'is_low_quality': rms_db < -40 or clipping_ratio > 0.1,
            'needs_normalization': rms_db < -25 or rms_db > -5
        }
        
        logger.info(f"Audio quality: RMS={rms_db:.2f}dB, Peak={peak_db:.2f}dB, Clipping={clipping_ratio:.3f}")
        
        return quality_info
        
    except Exception as e:
        logger.error(f"Error detecting audio quality: {str(e)}")
        return {
            'rms_db': -60,
            'peak_db': -60,
            'clipping_ratio': 0.0,
            'is_good_quality': False,
            'is_low_quality': True,
            'needs_normalization': False
        }
