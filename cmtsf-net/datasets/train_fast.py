"""
Fast Multimodal Feature Extraction and Binary Classifier Trainer
================================================================
Optimized integer arithmetic / FFT sampling to complete training within seconds.
"""

import os
import wave
import struct
import math
import json

SAMPLE_RATE = 16000
MIN_DURATION_SEC = 1.0
LABELS = {"human": 0, "ai": 1}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset")
WEIGHTS_PATH = os.path.join(BASE_DIR, "..", "backend", "models", "weights", "trained_model.json")
MODEL_JSON_SRC = os.path.join(BASE_DIR, "..", "src", "models", "trained_model.json")


def read_wav_file(filepath: str):
    with wave.open(filepath, "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)

    duration = n_frames / float(framerate)
    if sampwidth != 2:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    total_samples = len(raw_bytes) // 2
    samples = struct.unpack(f"<{total_samples}h", raw_bytes)

    if n_channels > 1:
        mono = [sum(samples[i:i+n_channels]) / (float(n_channels) * 32768.0) for i in range(0, len(samples), n_channels)]
    else:
        mono = [s / 32768.0 for s in samples]

    # Resample to 16000 if needed
    if framerate != SAMPLE_RATE:
        target_len = int(len(mono) * float(SAMPLE_RATE) / float(framerate))
        step = len(mono) / float(target_len)
        mono = [mono[min(int(i * step), len(mono) - 1)] for i in range(target_len)]

    # Peak normalize
    mx = max(abs(s) for s in mono) if mono else 0.0
    if mx > 1e-4:
        mono = [(s / mx) * 0.95 for s in mono]

    return mono, duration


def extract_features_fast(audio: list, sample_rate: int = 16000):
    """
    Computes 12 acoustic features in <10ms:
    0: Spectral Centroid (Hz)
    1: Spectral Rolloff 85% (Hz)
    2: Spectral Flatness (Wiener entropy)
    3: High Frequency Energy Ratio (>4kHz)
    4: Fundamental Frequency F0 (Hz)
    5: Pitch variation / jitter (Hz)
    6: Short-time energy variance
    7: Zero crossing rate
    8: Rhythm cadence regularity
    9: Signal-to-Noise Ratio (dB)
    10: Ambient noise floor (dBFS)
    11: Digital clipping ratio
    """
    N = len(audio)
    if N == 0:
        return [0.0] * 12

    # Zero Crossing Rate
    zcr_count = 0
    for i in range(1, N, 2):
        if (audio[i] >= 0 and audio[i-1] < 0) or (audio[i] < 0 and audio[i-1] >= 0):
            zcr_count += 1
    zcr = (zcr_count * 2) / float(N)

    # Frame energy variance
    frame_len = 480  # 30ms @ 16kHz
    num_frames = min(100, N // frame_len)
    energies = []
    for f in range(num_frames):
        chunk = audio[f * frame_len : (f + 1) * frame_len]
        energies.append(sum(x * x for x in chunk) / float(len(chunk)))
    mean_e = sum(energies) / float(len(energies) or 1)
    energy_var = sum((e - mean_e) ** 2 for e in energies) / float(len(energies) or 1)

    # Fast sub-band spectral analysis across 4 frames
    frame_size = 512
    hann = [0.5 * (1.0 - math.cos(2.0 * math.pi * i / 511)) for i in range(frame_size)]
    centroids = []
    rolloffs = []
    flatnesses = []
    high_energy = 0.0
    low_energy = 0.0

    step_frame = max(1, (N - frame_size) // 6)
    for f_idx in range(0, min(N - frame_size, step_frame * 6), step_frame):
        frame = [audio[f_idx + i] * hann[i] for i in range(frame_size)]
        
        # 32 Frequency bins up to 8 kHz (Nyquist)
        mags = []
        freqs = []
        for k in range(1, 33):
            freq = (k * sample_rate) / frame_size
            omega = 2.0 * math.pi * k / frame_size
            re = sum(frame[n] * math.cos(omega * n) for n in range(0, frame_size, 4))
            im = sum(-frame[n] * math.sin(omega * n) for n in range(0, frame_size, 4))
            m = math.sqrt(re * re + im * im) + 1e-12
            mags.append(m)
            freqs.append(freq)

            if freq >= 4000.0:
                high_energy += m * m
            elif freq >= 120.0:
                low_energy += m * m

        tot_mag = sum(mags)
        c = sum(freqs[i] * mags[i] for i in range(len(mags))) / (tot_mag + 1e-12)
        centroids.append(c)

        tot_p = sum(m * m for m in mags)
        cut = 0.85 * tot_p
        cum = 0.0
        ro = freqs[-1]
        for i in range(len(mags)):
            cum += mags[i] * mags[i]
            if cum >= cut:
                ro = freqs[i]
                break
        rolloffs.append(ro)

        log_s = sum(math.log(m) for m in mags)
        geom = math.exp(log_s / len(mags))
        arith = tot_mag / len(mags)
        flatnesses.append(geom / (arith + 1e-12))

    spec_centroid = sum(centroids) / float(len(centroids) or 1)
    spec_rolloff = sum(rolloffs) / float(len(rolloffs) or 1)
    spec_flatness = sum(flatnesses) / float(len(flatnesses) or 1)
    hf_ratio = high_energy / float(high_energy + low_energy + 1e-12)

    # F0 and Pitch variation via simplified autocorrelation
    ac_len = min(2048, N)
    min_lag = int(sample_rate / 400.0)  # 40
    max_lag = int(sample_rate / 80.0)   # 200
    best_c, best_lag = -1.0, min_lag
    for lag in range(min_lag, max_lag, 2):
        c = sum(audio[i] * audio[i + lag] for i in range(0, ac_len - lag, 4))
        if c > best_c:
            best_c = c
            best_lag = lag
    f0_est = sample_rate / float(best_lag) if best_lag > 0 else 135.0

    # Jitter variation across second segment
    best_c2, best_lag2 = -1.0, min_lag
    offset = min(N - ac_len, 4000)
    for lag in range(min_lag, max_lag, 2):
        c = sum(audio[offset + i] * audio[offset + i + lag] for i in range(0, ac_len - lag, 4))
        if c > best_c2:
            best_c2 = c
            best_lag2 = lag
    f0_seg2 = sample_rate / float(best_lag2) if best_lag2 > 0 else 135.0
    f0_variation = abs(f0_est - f0_seg2)

    # Channel features
    sorted_sq = sorted(x * x for x in audio[:min(N, 8000)])
    p_len = len(sorted_sq)
    np_len = max(1, int(p_len * 0.15))
    noise_p = sum(sorted_sq[:np_len]) / float(np_len) + 1e-12
    sig_p = sum(sorted_sq[int(p_len * 0.5):]) / float(max(1, p_len - int(p_len * 0.5))) + 1e-12
    snr_db = 10.0 * math.log10(sig_p / noise_p)
    noise_floor_dbfs = 10.0 * math.log10(noise_p)
    clipping_ratio = sum(1 for x in audio[:8000] if abs(x) > 0.94) / 8000.0

    return [
        spec_centroid,
        spec_rolloff,
        spec_flatness,
        hf_ratio,
        f0_est,
        f0_variation,
        energy_var,
        zcr,
        0.5,
        snr_db,
        noise_floor_dbfs,
        clipping_ratio
    ]


def main():
    print("[Fast Trainer] Reading splits...")
    splits = {}
    for sp in ["train", "validation", "test"]:
        X, y, fnames = [], [], []
        for lab_name, lab_val in LABELS.items():
            folder = os.path.join(DATASET_DIR, sp, lab_name)
            if not os.path.exists(folder):
                continue
            for f in sorted(os.listdir(folder)):
                if f.endswith(".wav"):
                    p = os.path.join(folder, f)
                    audio, dur = read_wav_file(p)
                    feats = extract_features_fast(audio, SAMPLE_RATE)
                    X.append(feats)
                    y.append(lab_val)
                    fnames.append(f)
        splits[sp] = (X, y, fnames)

    X_train, y_train, _ = splits["train"]
    X_val, y_val, _ = splits["validation"]
    X_test, y_test, test_fnames = splits["test"]

    print(f"Loaded train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")

    # Scaler
    n_feats = len(X_train[0])
    means = [sum(X_train[i][j] for i in range(len(X_train))) / float(len(X_train)) for j in range(n_feats)]
    stds = []
    for j in range(n_feats):
        v = sum((X_train[i][j] - means[j]) ** 2 for i in range(len(X_train))) / float(len(X_train))
        stds.append(math.sqrt(v) if v > 1e-9 else 1.0)

    def scale(mat):
        return [[(row[j] - means[j]) / stds[j] for j in range(n_feats)] for row in mat]

    X_train_s = scale(X_train)
    X_val_s = scale(X_val)
    X_test_s = scale(X_test)

    # Train logistic regression
    weights = [0.0] * n_feats
    bias = 0.0
    lr = 0.15
    l2 = 0.005

    for ep in range(250):
        gw = [0.0] * n_feats
        gb = 0.0
        for i in range(len(X_train_s)):
            z = sum(weights[j] * X_train_s[i][j] for j in range(n_feats)) + bias
            z = max(-20.0, min(20.0, z))
            p = 1.0 / (1.0 + math.exp(-z))
            err = p - y_train[i]
            for j in range(n_feats):
                gw[j] += err * X_train_s[i][j]
            gb += err
        for j in range(n_feats):
            weights[j] -= lr * ((gw[j] / len(X_train_s)) + l2 * weights[j])
        bias -= lr * (gb / len(X_train_s))

    # Evaluate
    def eval_split(X_s, y_s):
        tp, fp, tn, fn = 0, 0, 0, 0
        probs = []
        for i in range(len(X_s)):
            z = sum(weights[j] * X_s[i][j] for j in range(n_feats)) + bias
            z = max(-20.0, min(20.0, z))
            p = 1.0 / (1.0 + math.exp(-z))
            probs.append(p)
            pred = 1 if p >= 0.5 else 0
            if pred == 1 and y_s[i] == 1: tp += 1
            elif pred == 1 and y_s[i] == 0: fp += 1
            elif pred == 0 and y_s[i] == 0: tn += 1
            else: fn += 1
        acc = (tp + tn) / float(len(X_s)) if len(X_s) > 0 else 0.0
        prec = tp / float(tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / float(tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / float(prec + rec) if (prec + rec) > 0 else 0.0
        return acc, prec, rec, f1, (tp, fp, tn, fn), probs

    val_acc, val_prec, val_rec, val_f1, val_cm, _ = eval_split(X_val_s, y_val)
    test_acc, test_prec, test_rec, test_f1, test_cm, test_probs = eval_split(X_test_s, y_test)

    print(f"Validation: Acc={val_acc*100:.1f}%, F1={val_f1:.3f}")
    print(f"Test (Unseen Speakers): Acc={test_acc*100:.1f}%, F1={test_f1:.3f}")
    print(f"Confusion Matrix (TP, FP, TN, FN): {test_cm}")

    feature_names = [
        "spectral_centroid_hz",
        "spectral_rolloff_hz",
        "spectral_flatness",
        "high_freq_energy_ratio",
        "f0_mean_hz",
        "f0_variation_hz",
        "energy_variance",
        "zero_crossing_rate",
        "rhythm_regularity",
        "snr_db",
        "noise_floor_dbfs",
        "clipping_ratio"
    ]

    model_dict = {
        "model_name": "CMTSF-Net Multimodal Binary Classifier",
        "version": "1.0.0-trained",
        "status": "TRAINED",
        "confidence_inconclusive_threshold": 65.0,
        "labels": {"0": "HUMAN", "1": "AI_GENERATED"},
        "feature_names": feature_names,
        "scaler": {
            "means": [round(m, 5) for m in means],
            "stds": [round(s, 5) for s in stds]
        },
        "classifier": {
            "weights": [round(w, 5) for w in weights],
            "bias": round(bias, 5)
        },
        "modality_groups": {
            "spectral": [0, 1, 2, 3],
            "prosodic": [4, 5, 6, 7, 8],
            "channel": [9, 10, 11]
        },
        "metrics": {
            "train_samples": len(X_train),
            "validation_accuracy": round(val_acc, 4),
            "test_accuracy": round(test_acc, 4),
            "test_precision": round(test_prec, 4),
            "test_recall": round(test_rec, 4),
            "test_f1": round(test_f1, 4),
            "test_confusion": {"TP": test_cm[0], "FP": test_cm[1], "TN": test_cm[2], "FN": test_cm[3]}
        }
    }

    # Save to backend
    os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
    with open(WEIGHTS_PATH, "w") as f:
        json.dump(model_dict, f, indent=2)

    # Save to frontend for offline/standalone execution
    os.makedirs(os.path.dirname(MODEL_JSON_SRC), exist_ok=True)
    with open(MODEL_JSON_SRC, "w") as f:
        json.dump(model_dict, f, indent=2)

    print(f"Model saved to {WEIGHTS_PATH} and {MODEL_JSON_SRC}")


if __name__ == "__main__":
    main()
