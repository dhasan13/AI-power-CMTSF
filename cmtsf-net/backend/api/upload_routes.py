"""
Audio Upload & Verification Routes
==================================
Endpoints for testing pre-recorded call audio files against CMTSF-Net.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np

from ..audio.preprocessing import normalize_audio, resample_audio
from ..services.inference import CMTSFNetPipeline

router = APIRouter()
pipeline = CMTSFNetPipeline()


@router.post("/upload-audio")
async def upload_audio_endpoint(file: UploadFile = File(...)):
    """
    Accepts audio file (WAV/MP3/PCM) for batch verification.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    # For Phase 1 prototype testing, parse raw PCM or report file intake
    return {
        "filename": file.filename,
        "bytes_received": len(contents),
        "status": "INGESTED_FOR_CMTSF_ANALYSIS",
        "message": "File received. For streaming live calls, use ws://localhost:8000/ws/live-audio"
    }
