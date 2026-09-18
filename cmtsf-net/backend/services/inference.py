"""
CMTSF-Net Inference Pipeline Coordinator
========================================
Coordinates feature extraction, multi-modality analysis, gated fusion, and risk smoothing.
"""

from datetime import datetime, timezone
import numpy as np
from typing import Dict, Any, Optional

from ..features.spectral_features import extract_spectral_features
from ..features.prosodic_features import extract_prosodic_features
from ..features.channel_features import extract_channel_features
from ..models.spectral_model import SpectralCNNModel
from ..models.prosodic_model import ProsodicTCNModel
from ..models.channel_model import ChannelAnalysisModel
from ..models.fusion_model import GatedAttentionFusion
from ..services.risk_smoothing import TemporalRiskSmoother
from ..services.risk_engine import RiskDecisionEngine
from ..audio.preprocessing import calculate_audio_quality, detect_voice_activity


class CMTSFNetPipeline:
    def __init__(self):
        self.spectral_model = SpectralCNNModel()
        self.prosodic_model = ProsodicTCNModel()
        self.channel_model = ChannelAnalysisModel()
        self.fusion_network = GatedAttentionFusion()
        self.smoother = TemporalRiskSmoother()
        self.risk_engine = RiskDecisionEngine()

    def process_window(
        self,
        audio_window: np.ndarray,
        start_time_sec: float,
        end_time_sec: float,
        webrtc_stats: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes full CMTSF-Net analysis over a 4-second audio slice (64,000 samples @ 16kHz).
        """
        # 1. Quality & VAD check
        quality_info = calculate_audio_quality(audio_window)
        is_speech, vad_ratio = detect_voice_activity(audio_window)

        # 2. Extract modality features
        spec_feats = extract_spectral_features(audio_window)
        pros_feats = extract_prosodic_features(audio_window)
        chan_feats = extract_channel_features(audio_window, webrtc_stats=webrtc_stats)

        # 3. Individual Modality predictions
        spec_pred = self.spectral_model.predict(spec_feats)
        pros_pred = self.prosodic_model.predict(pros_feats)
        chan_pred = self.channel_model.predict(chan_feats)

        # 4. Gated Attention Fusion
        fusion_result = self.fusion_network.fuse(
            spectral_out=spec_pred,
            prosodic_out=pros_pred,
            channel_out=chan_pred,
            quality_score=quality_info["quality_score"]
        )

        raw_ai_prob = fusion_result["ai_voice_probability"]

        # 5. Temporal Risk Smoothing
        smoothed_prob = self.smoother.update(
            raw_ai_prob,
            window_meta={"range": f"{start_time_sec:.1f}-{end_time_sec:.1f}s", "vad_ratio": vad_ratio}
        )

        # 6. Risk Engine Evaluation
        decision = self.risk_engine.evaluate(smoothed_prob)

        # 7. Standardized payload matching API specification
        timestamp = datetime.now(timezone.utc).isoformat()

        return {
            "timestamp": timestamp,
            "window_range": f"{start_time_sec:.1f}s – {end_time_sec:.1f}s",
            "ai_probability": smoothed_prob,
            "raw_ai_probability": raw_ai_prob,
            "real_probability": round(1.0 - smoothed_prob, 3),
            "confidence": fusion_result["confidence"],
            "risk_level": decision["risk_level"],
            "system_action": decision["system_action"],
            "action_description": decision["description"],
            "trigger_challenge": decision["trigger_challenge"],
            "spectral_score": spec_pred["spectral_fake_probability"],
            "prosodic_score": pros_pred["prosodic_fake_probability"],
            "channel_score": chan_pred["channel_risk_score"],
            "modality_weights": fusion_result["modality_weights"],
            "audio_quality": quality_info,
            "vad": {
                "is_speech": is_speech,
                "speech_ratio": vad_ratio
            }
        }
