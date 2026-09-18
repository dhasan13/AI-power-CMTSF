# CMTSF-Net: Contextual Multimodal Temporal Spectral Fusion Network

### AI Voice Authenticity Detection & Live Phone Call Anti-Fraud Prototype

---

## 📌 Features

CMTSF-Net provides an AI voice authenticity verification pipeline supporting both **Customer-Facing MP3 Audio File Analysis** and **Live Streaming Phone Call Monitoring**:

1. **Customer-Facing MP3 Analysis**:
   - Drag-and-drop MP3 upload with file signature validation and 25MB safety caps.
   - Built-in audio player with scrub, volume, and playback controls.
   - 6-step progress pipeline: Uploading → Extraction → Spectral → Prosodic → Channel → Gated Fusion Result.
   - Clear classification: **Likely Human Voice**, **Likely AI-Generated Voice**, or **Suspicious / Inconclusive**.
   - Explainable AI (XAI) breakdown with individual Modality cards and dynamic Gated Attention weights.
   - One-click Downloadable Forensic PDF and JSON reports.
   - Clearly identified **Demo Mode** warning ensuring prototype scores are not confused with scientific certification.

2. **Real-Time Live Call Monitoring**:
   - 1-second audio chunk streaming over WebSockets (`/ws/live-audio`).
   - 4-second sliding window buffer with 1-second hop stride.
   - Temporal risk smoothing (EMA) and dynamic challenge-response trigger policies.

---

## 🪟 Windows VS Code Quickstart Commands

### Backend:
```powershell
cd cmtsf-net/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend will be accessible at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Frontend:
```powershell
cd frontend  # or workspace root
npm install
npm run dev
```

Frontend will open at: `http://localhost:3000`

---

## 🔌 API Endpoints

- `POST /api/analyze`: Accepts MP3/WAV file (`multipart/form-data`) and returns full multimodal JSON analysis.
- `GET  /api/health`: Service health and model status check.
- `GET  /api/report/{analysis_id}`: Retrieves stored forensic analysis record by ID.
- `WS   /ws/live-audio`: Real-time streaming WebSocket endpoint.

---

## 🔬 Verdict Risk Thresholds (Configurable)
- **0–40**: Likely Human / Low Risk
- **40–65**: Suspicious / Medium Risk
- **65–85**: Likely AI-Generated / High Risk
- **85–100**: Likely AI-Generated / Critical Risk

*Disclaimer: This is an AI-assisted prediction and is not definitive proof of synthetic speech.*

