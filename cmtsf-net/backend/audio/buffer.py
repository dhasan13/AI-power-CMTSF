"""
CMTSF-Net Audio Sliding Window Buffer
====================================
Maintains a real-time rolling audio buffer for continuous stream analysis.
Configuration:
  - Window Size: 4.0 seconds (64,000 samples @ 16kHz)
  - Stride (Hop Size): 1.0 second (16,000 samples @ 16kHz)
  - Sample Rate: 16,000 Hz (mono)

Sliding Progression:
  - Window 1: 0–4 seconds
  - Window 2: 1–5 seconds
  - Window 3: 2–6 seconds
  - Window 4: 3–7 seconds
"""

import numpy as np
from typing import Optional, Tuple, Dict, Any


class SlidingAudioBuffer:
    def __init__(self, sample_rate: int = 16000, window_duration_sec: float = 4.0, stride_duration_sec: float = 1.0):
        """
        Initializes the rolling audio window buffer.
        
        Args:
            sample_rate: Audio sampling rate in Hz (default: 16000)
            window_duration_sec: Duration of each analysis window in seconds (default: 4.0)
            stride_duration_sec: Time to advance window upon each step (default: 1.0)
        """
        self.sample_rate = sample_rate
        self.window_duration_sec = window_duration_sec
        self.stride_duration_sec = stride_duration_sec

        self.window_samples = int(self.sample_rate * self.window_duration_sec)  # 64,000 samples
        self.stride_samples = int(self.sample_rate * self.stride_duration_sec)  # 16,000 samples

        # Continuous buffer storing raw audio as float32 in [-1.0, 1.0]
        self._buffer = np.array([], dtype=np.float32)
        
        # Telemetry & window indexing
        self.total_chunks_received = 0
        self.windows_emitted = 0
        self.current_stream_time_sec = 0.0

    def append_chunk(self, chunk: np.ndarray) -> bool:
        """
        Appends an incoming mono audio chunk (float32, normalized [-1, 1]).
        Returns True if the buffer now holds at least 1 full window (4.0s).
        """
        if chunk.ndim > 1:
            chunk = chunk.flatten()
            
        if chunk.dtype != np.float32:
            chunk = chunk.astype(np.float32)

        self._buffer = np.concatenate((self._buffer, chunk))
        self.total_chunks_received += 1
        
        # Advance cumulative ingested audio duration
        added_seconds = len(chunk) / self.sample_rate
        self.current_stream_time_sec += added_seconds

        return len(self._buffer) >= self.window_samples

    def is_window_ready(self) -> bool:
        """Checks if enough audio samples (>= 4.0s) have accumulated."""
        return len(self._buffer) >= self.window_samples

    def get_current_window(self) -> Optional[Tuple[np.ndarray, float, float]]:
        """
        Extracts the current 4-second audio window without advancing.
        Returns:
            Tuple of (audio_array_4s, start_time_sec, end_time_sec) or None if not ready.
        """
        if not self.is_window_ready():
            return None

        window_audio = self._buffer[:self.window_samples].copy()
        start_time = self.windows_emitted * self.stride_duration_sec
        end_time = start_time + self.window_duration_sec
        return window_audio, start_time, end_time

    def slide(self) -> None:
        """
        Advances the buffer by removing the oldest 1.0 second (16,000 samples).
        """
        if len(self._buffer) >= self.stride_samples:
            self._buffer = self._buffer[self.stride_samples:]
            self.windows_emitted += 1
        else:
            self._buffer = np.array([], dtype=np.float32)

    def extract_and_slide(self) -> Optional[Tuple[np.ndarray, float, float]]:
        """
        Atomic helper: gets the current 4s window and slides the buffer by 1s.
        """
        result = self.get_current_window()
        if result is not None:
            self.slide()
        return result

    def get_status(self) -> Dict[str, Any]:
        """Returns buffer diagnostics for WebSocket status telemetry."""
        buffered_samples = len(self._buffer)
        buffered_sec = buffered_samples / self.sample_rate
        fill_percentage = min(100.0, (buffered_sec / self.window_duration_sec) * 100.0)

        return {
            "buffered_samples": buffered_samples,
            "buffered_seconds": round(buffered_sec, 2),
            "window_duration_sec": self.window_duration_sec,
            "stride_duration_sec": self.stride_duration_sec,
            "fill_percentage": round(fill_percentage, 1),
            "is_ready": self.is_window_ready(),
            "total_chunks_received": self.total_chunks_received,
            "windows_emitted": self.windows_emitted,
            "stream_duration_sec": round(self.current_stream_time_sec, 2),
            "current_window_range": f"{self.windows_emitted * self.stride_duration_sec:.1f}–{(self.windows_emitted * self.stride_duration_sec) + self.window_duration_sec:.1f}s" if self.is_window_ready() else "Buffering..."
        }

    def reset(self) -> None:
        """Flushes the buffer and resets all metrics for a new call session."""
        self._buffer = np.array([], dtype=np.float32)
        self.total_chunks_received = 0
        self.windows_emitted = 0
        self.current_stream_time_sec = 0.0
