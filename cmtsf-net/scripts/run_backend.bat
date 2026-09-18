@echo off
echo ====================================================
echo Starting CMTSF-Net FastAPI Real-Time Audio Server...
echo ====================================================
call venv\Scripts\activate.bat
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
