# 🎓 AI-Based Online Exam Proctoring System

A full-stack, production-ready exam platform with real-time AI-powered proctoring.

---

## 📁 Project Structure

```
EXAM MONITORING SYSTEM/
├── frontend/               # React.js + Tailwind CSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/       — Login page
│   │   │   ├── dashboard/  — Role dashboards (Admin/Staff/Student)
│   │   │   ├── exam/       — Exam interface, results, create exam
│   │   │   └── admin/      — Manage users, colleges, live monitor
│   │   ├── components/     — Reusable UI components
│   │   ├── context/        — AuthContext (JWT state)
│   │   ├── hooks/          — useProctoring (AI WebSocket)
│   │   └── services/       — Axios API service
│   └── package.json
│
├── backend/                # Node.js + Express REST API
│   ├── src/
│   │   ├── controllers/    — authController, examController, etc.
│   │   ├── routes/         — Express routers
│   │   ├── middleware/     — JWT auth, error handler
│   │   ├── config/         — DB pool, logger
│   │   └── server.js       — Main entry + Socket.IO
│   └── package.json
│
├── ai-proctoring/          # Python FastAPI + MediaPipe
│   ├── main.py             — FastAPI app, REST + WebSocket endpoints
│   ├── analyzer.py         — Face detection, gaze, head pose analysis
│   └── requirements.txt
│
├── database/
│   └── schema.sql          — Complete PostgreSQL schema
│
└── docker-compose.yml      — One-command deployment
```

---

## 👥 User Roles

| Role | Can Do |
|------|--------|
| **Main Admin** | Manage colleges, all users, all exams |
| **College Admin** | Manage staff & students in their college |
| **Staff** | Create exams, upload questions, monitor |
| **Student** | Attend enrolled exams, view results |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- npm or yarn

---

### Step 1 — Database Setup

```bash
# Start PostgreSQL and create database
psql -U postgres
CREATE DATABASE exam_proctoring;
\q

# Run schema
psql -U postgres -d exam_proctoring -f database/schema.sql
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Copy environment file
copy .env.example .env
# Edit .env with your DB credentials and JWT secret

# Install dependencies
npm install

# Start backend server (runs on port 5000)
npm run dev
```

Verify: Visit http://localhost:5000/api/health

---

### Step 3 — AI Proctoring Service Setup

```bash
cd ai-proctoring

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies (takes a few minutes)
pip install -r requirements.txt

# Copy env
copy .env.example .env

# Start AI service (runs on port 8000)
python main.py
```

Verify: Visit http://localhost:8000/health

---

### Step 4 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo REACT_APP_API_URL=http://localhost:5000/api > .env
echo REACT_APP_AI_WS_URL=ws://localhost:8000/ws >> .env

# Start React app (runs on port 3000)
npm start
```

Visit: http://localhost:3000

---

## 🐳 Docker Deployment (One Command)

```bash
# Build and start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
# AI Service: http://localhost:8000
```

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Main Admin | admin@examproctoring.com | Admin@123 |

> Create other users through the Admin dashboard after login.

---

## 🔄 System Workflow

```
1. Main Admin creates College → assigns College Admin
2. College Admin creates Staff & Students → enrolls students in exams
3. Staff creates Exam → uploads MCQ questions → publishes exam
4. Student logs in → identity verified via webcam
5. Exam starts → AI monitors continuously (face, eyes, head, tab)
6. Violations logged → staff alerted in real-time via Socket.IO
7. Exam auto-submits on timeout → results calculated instantly
8. Staff views results & violation report per student
```

---

## 🧠 AI Features

| Feature | Technology | Description |
|---------|------------|-------------|
| Face Detection | MediaPipe | Detects if face is present / multiple faces |
| Eye Tracking | MediaPipe Iris | Tracks iris position to detect gaze direction |
| Head Pose | OpenCV solvePnP | Detects if student turns head significantly |
| Identity Verification | DeepFace / Facenet512 | Compares live face with enrollment photo |
| Real-time Alerts | Socket.IO WebSocket | Instant violation alerts to monitoring staff |

---

## 🔐 Security Features

- Tab switch detection via `document.visibilitychange`
- Fullscreen enforcement (auto re-enter on exit)
- Copy/paste disabled on exam page
- Keyboard shortcut blocking (Ctrl+C, F12, etc.)
- Right-click disabled
- Window blur detection
- Auto-terminate after 10+ violations

---

## 🗄️ API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | ❌ | Login, get JWT |
| POST | /api/auth/register | Admin | Create user |
| GET | /api/auth/me | ✅ | Get current user |

### Exams
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/exams | ✅ | List exams |
| POST | /api/exams | Staff+ | Create exam |
| GET | /api/exams/:id | ✅ | Get exam + questions |
| PUT | /api/exams/:id | Staff+ | Update exam |
| POST | /api/exams/:id/enroll | Staff+ | Enroll students |

### Exam Sessions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/sessions/start | Student | Start/resume exam |
| POST | /api/sessions/:id/answer | Student | Save answer |
| POST | /api/sessions/:id/submit | Student | Submit exam |
| POST | /api/sessions/:id/violation | Any | Log violation |

---

## ⚠️ Common Errors & Fixes

### Backend won't connect to DB
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Fix: Make sure PostgreSQL is running and .env DB credentials are correct
```

### AI service MediaPipe import error
```
Error: No module named 'mediapipe'
Fix: Run pip install mediapipe inside the venv
```

### Webcam not working in browser
```
Error: NotAllowedError: Permission denied
Fix: Allow camera access in browser settings (chrome://settings/content/camera)
     Use HTTPS in production (webcam requires secure context)
```

### CORS error in frontend
```
Error: Access-Control-Allow-Origin missing
Fix: Make sure FRONTEND_URL in backend .env matches your React URL exactly
```

### JWT token expired
```
Error: 401 Token expired
Fix: Log out and log back in. Adjust JWT_EXPIRES_IN in .env if needed
```

---

## 🏗️ Production Deployment (Azure)

1. Provision Azure PostgreSQL Flexible Server
2. Build Docker images and push to Azure Container Registry
3. Deploy via Azure Container Apps or AKS
4. Set environment variables in Azure App Configuration
5. Use Azure CDN for frontend static files
6. Enable HTTPS with Azure-managed TLS certificates

---

## 📞 Tech Stack Summary

- **Frontend**: React 18, React Router v6, Tailwind CSS, Socket.IO client, react-webcam
- **Backend**: Node.js 18, Express 4, PostgreSQL (pg), JWT, Socket.IO, Winston logging
- **AI Service**: Python 3.10, FastAPI, MediaPipe, OpenCV, DeepFace, uvicorn
- **Database**: PostgreSQL 15 with UUID primary keys, indexes, triggers
- **Deployment**: Docker, docker-compose, Nginx (frontend), Azure-ready
