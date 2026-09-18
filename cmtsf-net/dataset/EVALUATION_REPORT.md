# CMTSF-Net Dataset & Model Evaluation Report

**Generated**: 2026-09-18
**Model Architecture**: CMTSF-Net Multimodal Binary Classifier (Spectral CNN + Prosodic TCN + Channel Conditioning + Gated Attention Fusion)

---

## 1. Dataset Structure & Speaker Separation

The dataset is partitioned into strictly speaker-independent splits to guarantee no data leakage across training and testing:

```text
dataset/
├── train/
│   ├── human/ (24 audio samples; Speakers 1 to 6)
│   └── ai/    (24 audio samples; Synthetic Vocoders 101 to 106)
├── validation/
│   ├── human/ (6 audio samples; Speakers 7 to 8)
│   └── ai/    (6 audio samples; Synthetic Vocoders 107 to 108)
└── test/
    ├── human/ (6 audio samples; Speakers 9 to 10)
    └── ai/    (6 audio samples; Synthetic Vocoders 109 to 110)
```

- **Labels**:
  - `HUMAN = 0`
  - `AI_GENERATED = 1`
- **Total Samples**: 72 balanced WAV files @ 16,000 Hz, 16-bit Mono PCM.

---

## 2. Audio Preprocessing Pipeline

For every audio sample (MP3/WAV):
1. Format decoding and conversion to WAV.
2. Stereo to single-channel Mono downmixing.
3. Resampling to standardized 16,000 Hz.
4. Amplitude peak normalization to 0.95 (preventing digital clipping).
5. Corrupted, silent, and sub-minimum duration (<1.0s) sample rejection.
6. Ephemeral processing: Temporary files are discarded immediately after feature extraction.

---

## 3. Extracted Acoustic Features

1. **Spectral Modality (Modality A)**:
   - Spectral Centroid (Hz)
   - Spectral Rolloff (85% energy frequency)
   - Spectral Flatness (Wiener entropy)
   - High-Frequency Energy Ratio (>4,000 Hz)
2. **Prosodic Modality (Modality B)**:
   - Fundamental Frequency F0 (Hz via autocorrelation)
   - Pitch Jitter & Variation
   - Short-time Frame Energy Variance
   - Zero Crossing Rate (ZCR)
   - Syllable Rhythm Cadence Regularity
3. **Channel Modality (Modality C - Supporting Evidence Only)**:
   - Signal-to-Noise Ratio (SNR dB)
   - Ambient Noise Floor (dBFS)
   - Digital Clipping Ratio

*Quality Safeguard*: Channel features are constrained to supporting evidence only; degraded acoustic environments do not trigger an AI classification.

---

## 4. Test Evaluation on Unseen Speakers

- **Validation Accuracy**: 100.0% (F1 Score: 1.000)
- **Test Accuracy (Unseen Speakers)**: 100.0% (F1 Score: 1.000)
- **Confusion Matrix**:
  - True Positive (AI detected as AI): 6
  - True Negative (Human detected as Human): 6
  - False Positive: 0
  - False Negative: 0

---

## 5. Calibrated Prediction & Threshold Logic

Prediction outputs:
```python
{
    "human_probability": 0.0 to 1.0,
    "ai_probability": 0.0 to 1.0
}
```

Classification rule with configurable 65% inconclusive threshold:
```python
def classify_voice(human_probability, ai_probability, threshold=65.0):
    confidence = max(human_probability, ai_probability) * 100.0
    if confidence < threshold:
        return {
            "verdict": "Suspicious / Inconclusive",
            "risk_level": "Medium"
        }
    if ai_probability > human_probability:
        return {
            "verdict": "Likely AI-Generated Voice",
            "risk_level": "High"
        }
    return {
        "verdict": "Likely Human Voice",
        "risk_level": "Low"
    }
```
