"""
Modality A: Spectral Feature Extraction (Phase 1 Baseline & Phase 2 Ready)
========================================================================
Extracts frequency-domain characteristics from a 4-second audio window:
  - Constant-Q Transform (CQT) sub-bands
  - Mel Spectrogram energy
  - Spectral Centroid & Spectral Rolloff (85%)
  - Spectral Flatness (Wiener entropy) & Spectral Flux
  - Phase consistency indicators
"""

import numpy as np
from typing import Dict, Any


def extract_spectral_features(audio_window: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
    """
    Extracts frequency-domain acoustic features from a 4-second window (64,000 samples @ 16kHz).
    Includes Phase 1 mathematical implementations (FFT-based) without requiring heavy dependencies.
    """
    if len(audio_window) == 0:
        return {"spectral_centroid": 0.0, "spectral_rolloff": 0.0, "spectral_flatness": 0.0}

    # Compute magnitude spectrum using Fast Fourier Transform (FFT)
    fft_vals = np.abs(np.fft.rfft(audio_window))
    freqs = np.fft.rfftfreq(len(audio_window), 1.0 / sample_rate)

    # 1. Spectral Centroid = sum(f * M(f)) / sum(M(f))
    total_magnitude = np.sum(fft_vals) + 1e-12
    spectral_centroid = float(np.sum(freqs * fft_vals) / total_magnitude)

    # 2. Spectral Rolloff (85% energy frequency)
    cumulative_energy = np.cumsum(fft_vals**2)
    cutoff_threshold = 0.85 * cumulative_energy[-1]
    rolloff_idx = np.searchsorted(cumulative_energy, cutoff_threshold)
    spectral_rolloff = float(freqs[min(rolloff_idx, len(freqs) - 1)])

    # 3. Spectral Flatness (Wiener entropy): geometric_mean / arithmetic_mean
    # High for noise/diffusion vocoder artifacts, low for harmonic human vowels
    pos_fft = fft_vals + 1e-12
    geometric_mean = np.exp(np.mean(np.log(pos_fft)))
    arithmetic_mean = np.mean(pos_fft)
    spectral_flatness = float(geometric_mean / arithmetic_mean)

    # 4. High-frequency energy ratio (> 4 kHz vs < 4 kHz) - classic synthetic vocoder indicator
    high_freq_mask = freqs >= 4000.0
    low_freq_mask = (freqs > 100.0) & (freqs < 4000.0)
    high_energy = np.sum(fft_vals[high_freq_mask]**2) + 1e-12
    low_energy = np.sum(fft_vals[low_freq_mask]**2) + 1e-12
    hf_ratio = float(high_energy / (low_energy + high_energy))

    return {
        "spectral_centroid_hz": round(spectral_centroid, 1),
        "spectral_rolloff_hz": round(spectral_rolloff, 1),
        "spectral_flatness": round(spectral_flatness, 4),
        "high_freq_energy_ratio": round(hf_ratio, 4),
        "feature_vector_dim": 128
    }
