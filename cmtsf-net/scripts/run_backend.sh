#!/bin/bash
echo "Starting CMTSF-Net FastAPI Backend..."
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
