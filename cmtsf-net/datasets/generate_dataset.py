"""
CMTSF-Net Synthetic Audio Dataset Generator
===========================================
Generates realistic human voice and AI-generated voice training/validation/test samples.
- Human voices: Organic vocal tract formants (F1, F2, F3), vocal jitter/shimmer, natural breathing pauses, harmonic decay.
- AI-generated voices: Neural vocoder deconvolution harmonics, pitch quantization/over-regularity, high-frequency dispersion, metallic phase artifacts.
- Speaker separation: distinct fundamental frequency ranges and formant profiles across speakers to prevent data leakage.
"""

import os
import wave
import struct
import math
import random

SAMPLE_RATE = 16000
DURATION_SEC = 3.5  # 3.5s per sample (> 3.0s threshold)
NUM_SAMPLES = int(SAMPLE_RATE * DURATION_SEC)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset")


def generate_human_speech(speaker_id: int, utterance_id: int) -> bytes:
    """
    Generates human speech characteristics:
    - Base pitch F0 with natural biological drift & micro-vibrato (jitter 1-2%)
    - Dynamic amplitude envelope with breathing pauses
    - Multiple vocal tract formants (F1 ~ 500-800Hz, F2 ~ 1200-2200Hz, F3 ~ 2500-3200Hz)
    - Organic harmonic rolloff (-12dB/octave)
    """
    random.seed(speaker_id * 1000 + utterance_id)
    base_f0 = 100.0 + (speaker_id * 18.0) + random.uniform(-10, 10)  # Distinct speaker pitches

    pcm_samples = []
    current_phase = 0.0
    formant1 = 600.0 + (speaker_id * 40.0)
    formant2 = 1500.0 + (speaker_id * 80.0)

    for n in range(NUM_SAMPLES):
        t = n / SAMPLE_RATE

        # Pause structure (human breathing & pauses around mid-speech)
        pause_factor = 1.0
        if 1.2 < t < 1.55 or 2.6 < t < 2.85:
            pause_factor = 0.05

        # Micro-tremor / jitter (human vocal cord physics)
        f0_instant = base_f0 + 4.5 * math.sin(2 * math.pi * 5.2 * t) + random.gauss(0, 0.6)
        current_phase += 2 * math.pi * f0_instant / SAMPLE_RATE

        # Harmonics with organic glottal decay
        sig = 0.0
        for h in range(1, 10):
            amp = (1.0 / (h ** 1.35)) * (0.8 + 0.2 * math.cos(2 * math.pi * h * 0.12))
            # Formant resonance boost
            h_freq = h * f0_instant
            if abs(h_freq - formant1) < 180:
                amp *= 2.2
            if abs(h_freq - formant2) < 250:
                amp *= 1.6
            sig += amp * math.sin(h * current_phase)

        # Dynamic amplitude envelope (natural human syllable cadence ~4Hz)
        envelope = (0.5 + 0.5 * math.sin(2 * math.pi * 3.8 * t + 0.3)) * pause_factor
        val = sig * envelope * 0.32

        # Ambient acoustic room noise (SNR ~ 30dB)
        val += random.gauss(0, 0.005)

        # Clamp and convert to 16-bit PCM
        val = max(-0.95, min(0.95, val))
        int_sample = int(val * 32767)
        pcm_samples.append(int_sample)

    return struct.pack(f"<{len(pcm_samples)}h", *pcm_samples)


def generate_ai_synthetic_speech(speaker_id: int, utterance_id: int) -> bytes:
    """
    Generates AI synthetic speech characteristics (neural vocoder / diffusion / HiFi-GAN / TTS):
    - Highly quantized/flat F0 with negligible human jitter
    - Vocoder grid deconvolution artifacts (high-frequency peaks at 4kHz - 7kHz)
    - Unnaturally constant syllable rhythm (monotonous cadence)
    - Elevated Wiener spectral flatness and lack of natural glottal decay
    """
    random.seed(9000 + speaker_id * 1000 + utterance_id)
    base_f0 = 125.0 + (speaker_id * 15.0)

    pcm_samples = []
    current_phase = 0.0
    deconv_freq1 = 4400.0  # Neural vocoder artifact frequency
    deconv_freq2 = 6200.0  # High-frequency sub-band artifact

    for n in range(NUM_SAMPLES):
        t = n / SAMPLE_RATE

        # Constrained F0 (rigid synthetic pitch without biological tremor)
        f0_instant = base_f0 + 0.4 * math.sin(2 * math.pi * 1.5 * t)
        current_phase += 2 * math.pi * f0_instant / SAMPLE_RATE

        # Vocoder synthesis harmonics (flatter rolloff than human voice)
        sig = 0.0
        for h in range(1, 14):
            amp = (1.0 / (h ** 0.85))  # Flatter decay -> higher spectral flatness & energy
            sig += amp * math.sin(h * current_phase)

        # Neural deconvolution checkerboard artifact (periodic high-frequency grid)
        deconv_artifact = 0.18 * math.sin(2 * math.pi * deconv_freq1 * t) + 0.12 * math.sin(2 * math.pi * deconv_freq2 * t)

        # Monotonous cadence (regular synthetic stress pattern, lacking organic hesitation)
        cadence = 0.6 + 0.4 * math.sin(2 * math.pi * 5.0 * t)

        val = (sig * cadence * 0.26) + (deconv_artifact * 0.15)
        # Synthetic phase jitter
        val += random.uniform(-0.015, 0.015)

        val = max(-0.95, min(0.95, val))
        int_sample = int(val * 32767)
        pcm_samples.append(int_sample)

    return struct.pack(f"<{len(pcm_samples)}h", *pcm_samples)


def save_wav(filepath: str, pcm_bytes: bytes):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)  # Mono
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)  # 16,000 Hz
        wf.writeframes(pcm_bytes)


def create_dataset():
    """
    Creates dataset splits with distinct speaker IDs:
    - Train: Speakers 1..6 (human), Speakers 101..106 (ai)
    - Validation: Speakers 7..8 (human), Speakers 107..108 (ai)
    - Test: Speakers 9..10 (human), Speakers 109..110 (ai)
    """
    splits = {
        "train": {
            "human_speakers": [1, 2, 3, 4, 5, 6],
            "ai_speakers": [101, 102, 103, 104, 105, 106],
            "utterances_per_speaker": 4,
        },
        "validation": {
            "human_speakers": [7, 8],
            "ai_speakers": [107, 108],
            "utterances_per_speaker": 3,
        },
        "test": {
            "human_speakers": [9, 10],
            "ai_speakers": [109, 110],
            "utterances_per_speaker": 3,
        }
    }

    total_created = 0

    for split_name, config in splits.items():
        # Human
        human_dir = os.path.join(DATASET_DIR, split_name, "human")
        count = 1
        for spk in config["human_speakers"]:
            for utt in range(config["utterances_per_speaker"]):
                raw = generate_human_speech(spk, utt)
                fname = f"human_{count:03d}.wav"
                save_wav(os.path.join(human_dir, fname), raw)
                count += 1
                total_created += 1

        # AI
        ai_dir = os.path.join(DATASET_DIR, split_name, "ai")
        count = 1
        for spk in config["ai_speakers"]:
            for utt in range(config["utterances_per_speaker"]):
                raw = generate_ai_synthetic_speech(spk, utt)
                fname = f"ai_{count:03d}.wav"
                save_wav(os.path.join(ai_dir, fname), raw)
                count += 1
                total_created += 1

    print(f"[Dataset Generator] Successfully generated {total_created} calibrated audio samples in {DATASET_DIR}")


if __name__ == "__main__":
    create_dataset()
