"""
CMTSF-Net Risk Decision Engine
==============================
Applies tiered threat policies and triggers security actions based on smoothed AI risk score.

Default Prototype Demonstration Thresholds:
  - 0.00 – 0.40: LOW RISK        -> Action: Continue monitoring
  - 0.40 – 0.65: SUSPICIOUS      -> Action: Display operator warning
  - 0.65 – 0.85: HIGH RISK       -> Action: Trigger challenge-response verification
  - 0.85 – 1.00: CRITICAL RISK   -> Action: Generate security alert & flag call trunk
"""

from typing import Dict, Any


class RiskDecisionEngine:
    def __init__(
        self,
        low_threshold: float = 0.40,
        suspicious_threshold: float = 0.65,
        high_threshold: float = 0.85
    ):
        self.low_threshold = low_threshold
        self.suspicious_threshold = suspicious_threshold
        self.high_threshold = high_threshold

    def evaluate(self, smoothed_risk: float) -> Dict[str, Any]:
        """
        Determines risk level and recommended system action.
        """
        if smoothed_risk < self.low_threshold:
            risk_level = "LOW"
            action = "CONTINUE_MONITORING"
            description = "Natural acoustic variation detected. Call stream appears authentic human speech."
            trigger_challenge = False
            security_flag = False
        elif smoothed_risk < self.suspicious_threshold:
            risk_level = "SUSPICIOUS"
            action = "DISPLAY_WARNING"
            description = "Minor spectral or prosodic cadence anomalies detected. Operator warning displayed."
            trigger_challenge = False
            security_flag = False
        elif smoothed_risk < self.high_threshold:
            risk_level = "HIGH"
            action = "TRIGGER_CHALLENGE"
            description = "Elevated synthetic signature detected. Recommend dynamic challenge-response."
            trigger_challenge = True
            security_flag = True
        else:
            risk_level = "CRITICAL"
            action = "SECURITY_ALERT"
            description = "Definitive synthetic voice cloning profile. Flagging session for fraud prevention."
            trigger_challenge = True
            security_flag = True

        return {
            "risk_level": risk_level,
            "system_action": action,
            "description": description,
            "trigger_challenge": trigger_challenge,
            "security_flag": security_flag,
            "thresholds_used": {
                "low": self.low_threshold,
                "suspicious": self.suspicious_threshold,
                "high": self.high_threshold
            }
        }
