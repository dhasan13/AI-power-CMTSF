"""
Temporal Risk Smoothing Service
===============================
Calculates Exponential Moving Average (EMA) across rolling 4-second audio analysis windows.
Prevents rapid alert flapping and false positives from momentary laughter or coughs.
"""

from typing import List, Dict, Any


class TemporalRiskSmoother:
    def __init__(self, alpha: float = 0.35, max_history_len: int = 30):
        """
        Args:
            alpha: Smoothing factor (0 < alpha <= 1). Higher values react faster to changes.
            max_history_len: Maximum historical window scores to retain in memory.
        """
        self.alpha = alpha
        self.max_history_len = max_history_len
        self.smoothed_risk: float = 0.0
        self.history: List[Dict[str, Any]] = []

    def update(self, raw_ai_probability: float, window_meta: Dict[str, Any] = None) -> float:
        """
        Updates running smoothed risk with newly inferred 4-second window probability.
        """
        if len(self.history) == 0:
            self.smoothed_risk = raw_ai_probability
        else:
            self.smoothed_risk = (self.alpha * raw_ai_probability) + ((1.0 - self.alpha) * self.smoothed_risk)

        record = {
            "window_index": len(self.history) + 1,
            "raw_score": round(raw_ai_probability, 3),
            "smoothed_score": round(self.smoothed_risk, 3),
            "meta": window_meta or {}
        }
        self.history.append(record)

        if len(self.history) > self.max_history_len:
            self.history.pop(0)

        return round(self.smoothed_risk, 3)

    def get_history(self) -> List[Dict[str, Any]]:
        return list(self.history)

    def reset(self) -> None:
        self.smoothed_risk = 0.0
        self.history.clear()
