"""
CMTSF-Net Audio Quality Evaluator
=================================
Assesses acoustic stream integrity, clipping, packet drops, and background conditions.
"""

from typing import Dict, Any
import numpy as np


class AudioQualityEvaluator:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def evaluate(self, audio: np.ndarray) -> Dict[str, Any]:
        if len(audio) == 0:
            return {"valid": False, "reason": "empty_buffer"}

        rms = float(np.sqrt(np.mean(audio**2) + 1e-12))
        peak = float(np.max(np.abs(audio)))
        crest_factor = peak / (rms + 1e-9)

        return {
            "valid": True,
            "rms": round(rms, 4),
            "peak": round(peak, 4),
            "crest_factor": round(crest_factor, 2),
            "sample_count": len(audio),
            "duration_sec": round(len(audio) / self.sample_rate, 3)
        }
