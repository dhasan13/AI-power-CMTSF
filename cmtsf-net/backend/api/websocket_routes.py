"""
WebSocket Live Audio Streaming & Real-Time Analysis Route
==========================================================
Endpoints:
  - WS /ws/live-analysis (Primary real-time endpoint)
  - WS /ws/live-audio    (Legacy compatibility endpoint)

Accepts live audio streams from client microphone:
  - Formats supported:
      1. Binary PCM 16-bit 16kHz mono (typical browser AudioWorklet or recorder stream)
      2. Binary Float32 array
      3. JSON message containing base64 audio and optional telemetry stats
  - Appends chunks into 4-second sliding audio buffer (64,000 samples @ 16kHz)
  - Slides forward by 1 second (16,000 samples) every 1 second
  - Emits real-time inference result matching the specified API format:
      {
        "timestamp": "2026-09-18T09:41:04Z",
        "verdict": "Likely AI-Generated Voice" | "Likely Human Voice" | "Suspicious / Inconclusive",
        "confidence": 87.0,
        "ai_probability": 0.87,
        "human_probability": 0.13,
        "risk_level": "Low" | "Suspicious" | "High" | "Critical",
        "spectral_score": 0.91,
        "prosodic_score": 0.84,
        "channel_score": 0.72,
        "audio_quality": 89.0,
        "analysis_duration": 4.0,
        "mode": "Trained Model"
      }
"""

import json
import base64
from datetime import datetime, timezone
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..audio.buffer import SlidingAudioBuffer
from ..audio.preprocessing import pcm16_bytes_to_float32, resample_audio
from ..services.inference import CMTSFNetPipeline
from ..models.trained_classifier import TrainedVoiceClassifier

router = APIRouter()

# Global pipeline instance (CPU lightweight) and trained classifier
pipeline = CMTSFNetPipeline()
trained_classifier = TrainedVoiceClassifier()


def determine_verdict_and_risk(
    ai_prob: float,
    confidence: float,
    threshold_low: float = 40.0,
    threshold_suspicious: float = 65.0,
    threshold_high: float = 85.0
):
    """
    Applies configurable risk thresholds:
      0–40     Low Risk
      40–65    Suspicious
      65–85    High Risk
      85–100   Critical
    And verdict logic:
      Confidence < 65% -> Suspicious / Inconclusive
      ai_prob > 0.5    -> Likely AI-Generated Voice
      otherwise        -> Likely Human Voice
    """
    ai_percent = ai_prob * 100.0

    if ai_percent < threshold_low:
        risk_level = "Low"
    elif ai_percent < threshold_suspicious:
        risk_level = "Suspicious"
    elif ai_percent < threshold_high:
        risk_level = "High"
    else:
        risk_level = "Critical"

    # Verdict assignment
    if confidence < threshold_suspicious or risk_level == "Suspicious":
        verdict = "Suspicious / Inconclusive"
    elif ai_prob >= 0.5:
        verdict = "Likely AI-Generated Voice"
    else:
        verdict = "Likely Human Voice"

    return verdict, risk_level


async def handle_live_websocket(websocket: WebSocket):
    await websocket.accept()
    print("[CMTSF-Net WS] Client connected to live voice stream.")

    # Rolling buffer: 4.0s window, 1.0s stride (updated every 1s)
    buffer = SlidingAudioBuffer(sample_rate=16000, window_duration_sec=4.0, stride_duration_sec=1.0)
    pipeline.smoother.reset()

    mode_str = "Trained Model" if trained_classifier.is_loaded else "DEMO MODE — NOT VALIDATED"

    # Send initial connection confirmation
    await websocket.send_json({
        "type": "CONNECTION_ESTABLISHED",
        "message": "Connected to CMTSF-Net Live Call Monitoring Backend",
        "mode": mode_str,
        "config": {
            "sample_rate": 16000,
            "window_duration_sec": 4.0,
            "stride_duration_sec": 1.0,
            "window_samples": 64000
        }
    })

    try:
        while True:
            message = await websocket.receive()
            audio_float32 = None
            webrtc_stats = None

            if "bytes" in message and message["bytes"]:
                # Binary transmission of PCM 16-bit bytes
                raw_bytes = message["bytes"]
                audio_float32 = pcm16_bytes_to_float32(raw_bytes)

            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type", "AUDIO_CHUNK")

                    if msg_type == "RESET":
                        buffer.reset()
                        pipeline.smoother.reset()
                        await websocket.send_json({"type": "BUFFER_RESET", "status": buffer.get_status()})
                        continue

                    elif msg_type == "AUDIO_CHUNK":
                        if "audio_base64" in payload:
                            b64_data = payload["audio_base64"]
                            raw_bytes = base64.b64decode(b64_data)
                            audio_float32 = pcm16_bytes_to_float32(raw_bytes)
                        elif "samples" in payload:
                            audio_float32 = np.array(payload["samples"], dtype=np.float32)

                        client_sr = payload.get("sample_rate", 16000)
                        if client_sr != 16000 and audio_float32 is not None:
                            audio_float32 = resample_audio(audio_float32, orig_sr=client_sr, target_sr=16000)

                        webrtc_stats = payload.get("webrtc_stats", None)

                except json.JSONDecodeError:
                    continue

            if audio_float32 is not None and len(audio_float32) > 0:
                buffer.append_chunk(audio_float32)
                buf_status = buffer.get_status()

                # Notify client of buffer progress
                await websocket.send_json({
                    "type": "BUFFER_STATUS",
                    "status": buf_status
                })

                # Once 4 seconds of audio is accumulated, evaluate and slide forward by 1 second
                while buffer.is_window_ready():
                    window_data = buffer.get_current_window()
                    if window_data is None:
                        break

                    audio_4s, start_t, end_t = window_data

                    # Run CMTSF-Net Multimodal Inference
                    raw_result = pipeline.process_window(
                        audio_window=audio_4s,
                        start_time_sec=start_t,
                        end_time_sec=end_t,
                        webrtc_stats=webrtc_stats
                    )

                    ai_p = float(raw_result["ai_probability"])
                    human_p = round(1.0 - ai_p, 4)
                    conf = round(max(ai_p, human_p) * 100.0, 1)

                    verdict, risk_level = determine_verdict_and_risk(ai_p, conf)

                    # Quality score
                    q_info = raw_result.get("audio_quality", {})
                    q_score = round(q_info.get("quality_score", 0.88) * 100.0, 1) if isinstance(q_info, dict) else 88.0

                    payload_out = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "verdict": verdict,
                        "confidence": conf,
                        "ai_probability": round(ai_p, 4),
                        "human_probability": human_p,
                        "risk_level": risk_level,
                        "spectral_score": round(float(raw_result.get("spectral_score", 0.5)), 4),
                        "prosodic_score": round(float(raw_result.get("prosodic_score", 0.5)), 4),
                        "channel_score": round(float(raw_result.get("channel_score", 0.5)), 4),
                        "audio_quality": q_score,
                        "analysis_duration": 4.0,
                        "window_range": raw_result.get("window_range", "0.0s - 4.0s"),
                        "mode": mode_str,
                        "vad": raw_result.get("vad", {"is_speech": True, "speech_ratio": 0.95})
                    }

                    # Emit both direct payload and typed payload
                    await websocket.send_json({
                        "type": "INFERENCE_RESULT",
                        "data": payload_out,
                        "buffer_state": buffer.get_status()
                    })

                    # Slide window forward by 1 second (16,000 samples)
                    buffer.slide()

    except WebSocketDisconnect:
        print("[CMTSF-Net WS] Client disconnected cleanly.")
    except Exception as e:
        print(f"[CMTSF-Net WS] Stream error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


@router.websocket("/ws/live-analysis")
async def live_analysis_websocket_endpoint(websocket: WebSocket):
    """Primary live analysis WebSocket endpoint per user specification."""
    await handle_live_websocket(websocket)


@router.websocket("/ws/live-audio")
async def live_audio_websocket_endpoint(websocket: WebSocket):
    """Compatibility live audio WebSocket endpoint."""
    await handle_live_websocket(websocket)
