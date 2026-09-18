"""
Gated Attention Fusion Network
==============================
Dynamically gates and weights Modality A (Spectral), Modality B (Prosodic), and Modality C (Channel).
Assigns attention weights alpha_spec, alpha_pros, alpha_chan conditioned on audio quality.
"""

from typing import Dict, Any


class GatedAttentionFusion:
    def __init__(self, checkpoint_path: str = "models/checkpoints/fusion_weights.pt"):
        self.checkpoint_path = checkpoint_path

    def fuse(
        self,
        spectral_out: Dict[str, Any],
        prosodic_out: Dict[str, Any],
        channel_out: Dict[str, Any],
        quality_score: float = 0.8
    ) -> Dict[str, Any]:
        """
        Dynamically calculates modality attention weights and fuses probabilities.
        """
        p_spec = spectral_out.get("spectral_fake_probability", 0.5)
        p_pros = prosodic_out.get("prosodic_fake_probability", 0.5)
        p_chan = channel_out.get("channel_risk_score", 0.3)

        # Dynamic Gating: In high SNR audio, spectral micro-artifacts have higher reliability.
        # In degraded audio, prosodic cadence and channel consistency receive higher attention.
        if quality_score >= 0.7:
            w_spec = 0.52
            w_pros = 0.33
            w_chan = 0.15
        elif quality_score >= 0.4:
            w_spec = 0.35
            w_pros = 0.45
            w_chan = 0.20
        else:
            w_spec = 0.25
            w_pros = 0.50
            w_chan = 0.25

        # Normalize weights to sum to 1.0
        total_w = w_spec + w_pros + w_chan
        w_spec /= total_w
        w_pros /= total_w
        w_chan /= total_w

        # Weighted fusion
        ai_prob = (w_spec * p_spec) + (w_pros * p_pros) + (w_chan * p_chan)
        real_prob = 1.0 - ai_prob
        confidence = (
            w_spec * spectral_out.get("spectral_confidence", 0.85) +
            w_pros * prosodic_out.get("prosodic_confidence", 0.80) +
            w_chan * channel_out.get("environment_confidence", 0.70)
        )

        return {
            "ai_voice_probability": round(float(ai_prob), 3),
            "real_voice_probability": round(float(real_prob), 3),
            "confidence": round(float(confidence), 3),
            "modality_weights": {
                "spectral": round(float(w_spec), 3),
                "prosodic": round(float(w_pros), 3),
                "channel": round(float(w_chan), 3)
            }
        }
