"""
CMTSF-Net Audio Preprocessing Module
====================================
Standardizes raw microphone/call audio inputs for downstream multimodal feature extraction.
Handles:
  - Mono conversion
  - Resampling to 16,000 Hz
  - Amplitude normalization (peak / RMS)
  - Energy-based Voice Activity Detection (VAD)
  - Signal quality metrics (SNR, clipping, noise floor)
"""

import numpy as np
from typing import Dict, Any, Tuple


def convert_to_mono(audio: np.ndarray) -> np.ndarray:
    """
    Converts multi-channel audio to single-channel mono by averaging across channels.
    """
    if audio.ndim == 1:
        return audio
    elif audio.ndim == 2:
        return np.mean(audio, axis=1).astype(audio.dtype)
    else:
        return audio.flatten().astype(np.float32)


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """
    Resamples audio array to target sample rate (default 16000 Hz).
    Uses linear interpolation for minimal latency in Phase 1; scipy.signal.resample can be used.
    """
    if orig_sr == target_sr:
        return audio

    num_target_samples = int(len(audio) * float(target_sr) / float(orig_sr))
    if num_target_samples == 0:
        return np.array([], dtype=np.float32)

    # Linear interpolation across time indices
    orig_indices = np.linspace(0, len(audio) - 1, num=len(audio))
    target_indices = np.linspace(0, len(audio) - 1, num=num_target_samples)
    resampled = np.interp(target_indices, orig_indices, audio)
    return resampled.astype(np.float32)


def normalize_audio(audio: np.ndarray, target_peak: float = 0.95) -> np.ndarray:
    """
    Normalizes audio peak amplitude to target_peak (preventing digital clipping).
    Guards against zero-division for silent chunks.
    """
    if len(audio) == 0:
        return audio
    
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        return (audio / peak) * target_peak
    return audio


def detect_voice_activity(audio: np.ndarray, sample_rate: int = 16000, frame_duration_ms: int = 20, threshold_db: float = -42.0) -> Tuple[bool, float]:
    """
    Performs energy-based Voice Activity Detection (VAD).
    Returns:
        (is_speech_present, active_speech_ratio)
    """
    if len(audio) == 0:
        return False, 0.0

    frame_size = int(sample_rate * (frame_duration_ms / 1000.0))
    if frame_size <= 0:
        frame_size = 320

    num_frames = len(audio) // frame_size
    if num_frames == 0:
        return False, 0.0

    speech_frames = 0
    for i in range(num_frames):
        frame = audio[i * frame_size : (i + 1) * frame_size]
        rms = np.sqrt(np.mean(frame**2) + 1e-12)
        db = 20.0 * np.log10(rms)
        if db > threshold_db:
            speech_frames += 1

    active_ratio = speech_frames / float(num_frames)
    is_speech_active = active_ratio >= 0.15
    return is_speech_active, round(active_ratio, 3)


def calculate_audio_quality(audio: np.ndarray) -> Dict[str, Any]:
    """
    Computes audio quality indicators without removing background acoustics:
      - Estimated SNR (dB)
      - Peak amplitude & clipping detection
      - RMS energy
      - Background noise floor estimate (dBFS)
    """
    if len(audio) == 0:
        return {
            "snr_db": 0.0,
            "rms_energy": 0.0,
            "is_clipped": False,
            "noise_floor_dbfs": -90.0,
            "quality_score": 0.5
        }

    rms = np.sqrt(np.mean(audio**2) + 1e-12)
    peak = np.max(np.abs(audio))
    is_clipped = bool(peak >= 0.999)

    # Estimate noise floor by lowest 10% energy percentiles
    sorted_abs = np.sort(np.abs(audio))
    noise_est = np.mean(sorted_abs[: max(1, int(len(sorted_abs) * 0.1))]) + 1e-9
    signal_est = np.mean(sorted_abs[int(len(sorted_abs) * 0.5) :]) + 1e-9

    snr_db = 20.0 * np.log10(signal_est / noise_est)
    noise_floor_dbfs = 20.0 * np.log10(noise_est)

    # Simple composite quality score (0.0 - 1.0)
    quality_score = min(1.0, max(0.1, (snr_db + 10.0) / 40.0))
    if is_clipped:
        quality_score *= 0.75

    return {
        "snr_db": round(float(snr_db), 2),
        "rms_energy": round(float(rms), 4),
        "peak_amplitude": round(float(peak), 4),
        "is_clipped": is_clipped,
        "noise_floor_dbfs": round(float(noise_floor_dbfs), 2),
        "quality_score": round(float(quality_score), 2)
    }


def pcm16_bytes_to_float32(pcm_data: bytes) -> np.ndarray:
    """
    Converts raw 16-bit signed integer linear PCM bytes into float32 array in [-1.0, 1.0].
    Standard format emitted by browser Web Audio script processors or MediaRecorder.
    """
    int16_arr = np.frombuffer(pcm_data, dtype=np.int16)
    return (int16_arr.astype(np.float32) / 32768.0)
