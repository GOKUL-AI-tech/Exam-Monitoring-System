@echo off
echo ============================================
echo  Installing AI Proctoring Dependencies
echo ============================================

echo [1/4] Upgrading pip...
python -m pip install --upgrade pip

echo [2/4] Installing FastAPI + Uvicorn...
pip install fastapi uvicorn[standard] python-multipart python-dotenv websockets

echo [3/4] Installing OpenCV + NumPy...
pip install opencv-python numpy Pillow requests

echo [4/4] Installing MediaPipe (face detection)...
pip install mediapipe

echo.
echo ============================================
echo  Installation complete!
echo  Run: python main.py
echo ============================================
pause
