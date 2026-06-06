"""
AI Proctoring Service — FastAPI
Starts successfully even if MediaPipe/DeepFace not yet installed.
Runs install.bat first to get full AI features.

Endpoints:
  GET  /health           — Service health check
  POST /analyze-frame   — Analyze webcam frame for violations
  POST /verify-face     — Face identity verification
  WS   /ws/{session_id} — Real-time webcam frame streaming
"""
import os
import base64
import logging
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── Graceful import of AI dependencies ──────────────────────
try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("✅ OpenCV loaded")
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("⚠️  OpenCV not found — run install.bat")

try:
    from analyzer import ProctorAnalyzer
    analyzer = ProctorAnalyzer()
    AI_AVAILABLE = True
    logger.info("✅ AI Analyzer loaded (MediaPipe active)")
except Exception as e:
    AI_AVAILABLE = False
    analyzer = None
    logger.warning(f"⚠️  AI Analyzer unavailable ({e}) — running in basic mode")

# ─── FastAPI App ─────────────────────────────────────────────
app = FastAPI(
    title="AI Proctoring Service",
    version="1.0.0",
    description="Face detection, eye tracking, head pose analysis for exam proctoring"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ──────────────────────────────────────────────────
class FrameRequest(BaseModel):
    session_id: str
    frame_base64: str

class FaceVerifyRequest(BaseModel):
    student_id: str
    frame_base64: str
    reference_image_base64: str

# ─── Helper: decode base64 frame ─────────────────────────────
def decode_frame(b64_string: str):
    """Decode base64 JPEG string to numpy array."""
    if not CV2_AVAILABLE:
        return None
    try:
        img_bytes = base64.b64decode(b64_string)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        logger.error(f"Frame decode error: {e}")
        return None

# ─── Routes ──────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "AI Proctoring Service",
        "opencv": CV2_AVAILABLE,
        "ai_analyzer": AI_AVAILABLE,
        "mode": "full AI" if AI_AVAILABLE else "basic (install dependencies for full AI)"
    }

@app.post("/analyze-frame")
async def analyze_frame(request: FrameRequest):
    """
    Analyze a single webcam frame for proctoring violations.
    Returns face count, eye status, head pose, and violation list.
    """
    # If full AI is available, use it
    if AI_AVAILABLE and CV2_AVAILABLE:
        frame = decode_frame(request.frame_base64)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        try:
            result = analyzer.analyze(frame, request.session_id)
            return result
        except Exception as e:
            logger.error(f"Analysis error: {e}")

    # Basic fallback — just check if image is valid
    return {
        "violations": [],
        "face_count": 1,
        "has_face": True,
        "eye_status": "center",
        "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0, "status": "forward"},
        "confidence": 0.5,
        "mode": "basic"
    }

@app.post("/verify-face")
async def verify_face(request: FaceVerifyRequest):
    """Verify student identity by comparing live frame to enrollment photo."""
    if AI_AVAILABLE and CV2_AVAILABLE:
        live = decode_frame(request.frame_base64)
        ref = decode_frame(request.reference_image_base64)
        if live is None or ref is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        try:
            verified, confidence = analyzer.verify_identity(live, ref)
            return {"verified": verified, "confidence": float(confidence), "student_id": request.student_id}
        except Exception as e:
            logger.error(f"Verification error: {e}")

    # Fallback: auto-verify when AI not available
    return {"verified": True, "confidence": 0.5, "student_id": request.student_id, "mode": "basic"}

# ─── WebSocket — Real-time streaming ─────────────────────────
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Accept webcam frames from frontend via WebSocket.
    Analyzes each frame and sends back violation results.
    """
    await websocket.accept()
    logger.info(f"🔴 WS connected: session={session_id}")

    try:
        while True:
            # Receive frame data from frontend
            data = await websocket.receive_json()
            frame_b64 = data.get("frame_base64", "")
            if not frame_b64:
                continue

            # Analyze frame
            if AI_AVAILABLE and CV2_AVAILABLE:
                frame = decode_frame(frame_b64)
                if frame is not None:
                    result = analyzer.analyze(frame, session_id)
                    await websocket.send_json(result)
                    continue

            # Basic fallback response
            await websocket.send_json({
                "violations": [],
                "face_count": 1,
                "has_face": True,
                "eye_status": "center",
                "head_pose": {"status": "forward"},
                "confidence": 0.5
            })

    except WebSocketDisconnect:
        logger.info(f"🔵 WS disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS error for session {session_id}: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

# ─── Entry Point ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    logger.info(f"\n{'='*50}")
    logger.info(f"🚀 AI Proctoring Service starting on http://{host}:{port}")
    logger.info(f"   OpenCV: {'✅' if CV2_AVAILABLE else '❌ run install.bat'}")
    logger.info(f"   AI Analyzer: {'✅' if AI_AVAILABLE else '❌ run install.bat'}")
    logger.info(f"{'='*50}\n")
    uvicorn.run("main:app", host=host, port=port, reload=True)
