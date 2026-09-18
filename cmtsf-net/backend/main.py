"""
CMTSF-Net FastAPI Backend Server (Phase 1)
===========================================
Main entry point for real-time live phone call analysis & voice clone detection.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from .api.websocket_routes import router as ws_router, pipeline
from .api.upload_routes import router as upload_router
from .api.challenge_routes import router as challenge_router
from .api.routes import router as api_router

app = FastAPI(
    title="CMTSF-Net Live Voice Clone Detection API",
    description="Contextual Multimodal Temporal Spectral Fusion Network for Real-Time Call Monitoring",
    version="1.0.0-phase1"
)

# Enable CORS for local React development server (Vite default: http://localhost:5173 or http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router)
app.include_router(ws_router)
app.include_router(upload_router)
app.include_router(challenge_router)


@app.get("/health")
async def health_check():
    """Service health and uptime endpoint."""
    return {
        "status": "HEALTHY",
        "service": "CMTSF-Net Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase": "Phase 1 - Live Streaming & Sliding Window Buffer"
    }


@app.get("/system-status")
async def system_status():
    """Returns architecture status, active models, and window settings."""
    return {
        "system": "CMTSF-Net Prototype",
        "streaming_config": {
            "sample_rate_hz": 16000,
            "channels": 1,
            "window_size_sec": 4.0,
            "stride_sec": 1.0,
            "chunk_size_sec": 1.0,
            "window_samples": 64000
        },
        "modalities": {
            "modality_a_spectral": {
                "name": "Spectral-Phase CNN",
                "status": "READY",
                "checkpoint_loaded": pipeline.spectral_model.is_trained_checkpoint_loaded
            },
            "modality_b_prosodic": {
                "name": "Prosodic-Behavioral TCN",
                "status": "READY",
                "checkpoint_loaded": pipeline.prosodic_model.is_trained_checkpoint_loaded
            },
            "modality_c_channel": {
                "name": "Channel & WebRTC Telemetry",
                "status": "READY"
            }
        },
        "fusion": "Gated Attention Fusion with Audio Quality Conditioning",
        "risk_engine": {
            "low_threshold": pipeline.risk_engine.low_threshold,
            "suspicious_threshold": pipeline.risk_engine.suspicious_threshold,
            "high_threshold": pipeline.risk_engine.high_threshold
        }
    }


@app.get("/risk-history")
async def get_risk_history():
    """Returns recent smoothed temporal risk history."""
    return {
        "count": len(pipeline.smoother.history),
        "history": pipeline.smoother.get_history()
    }


if __name__ == "__main__":
    import uvicorn
    # Default host and port for local testing
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
