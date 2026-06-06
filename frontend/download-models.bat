@echo off
echo Downloading face-api.js AI models for local use...
echo (This avoids slow CDN loading during exams)
echo.

set BASE=https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights
set OUT=%~dp0public\weights

if not exist "%OUT%" mkdir "%OUT%"

curl -L "%BASE%/tiny_face_detector_model-weights_manifest.json" -o "%OUT%\tiny_face_detector_model-weights_manifest.json"
curl -L "%BASE%/tiny_face_detector_model-shard1"                 -o "%OUT%\tiny_face_detector_model-shard1"
curl -L "%BASE%/face_landmark_68_tiny_model-weights_manifest.json" -o "%OUT%\face_landmark_68_tiny_model-weights_manifest.json"
curl -L "%BASE%/face_landmark_68_tiny_model-shard1"              -o "%OUT%\face_landmark_68_tiny_model-shard1"

echo.
echo Done! Models saved to: %OUT%
echo Restart the frontend (npm start) to use local models.
pause
