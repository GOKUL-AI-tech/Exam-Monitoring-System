// ============================================================
// AI-Based Online Exam Proctoring System - Express Server
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time proctoring alerts
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});

// ─── Security Middleware ─────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Rate limiting — disabled in development, 1000 req/15min in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  skip: () => process.env.NODE_ENV === 'development',
  message: { success: false, message: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// ─── General Middleware ──────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Exam Proctoring API is running', timestamp: new Date() });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api', routes);

// ─── Socket.IO — Real-time Proctoring Alerts ─────────────
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a room for a specific exam session
  socket.on('join_session', (sessionId) => {
    socket.join(`session_${sessionId}`);
    logger.info(`Socket ${socket.id} joined session_${sessionId}`);
  });

  // Proctor (staff/admin) joins monitoring room
  socket.on('join_monitor', (examId) => {
    socket.join(`monitor_${examId}`);
  });

  // AI service sends violation alert (legacy)
  socket.on('violation_alert', (data) => {
    io.to(`monitor_${data.exam_id}`).emit('new_violation', data);
  });

  // ── NEW: Student connected to exam ─────────────────────────
  socket.on('student_connected', (data) => {
    socket.join(`session_${data.session_id}`);
    io.to(`monitor_${data.exam_id}`).emit('student_connected', data);
    logger.info(`Student connected: ${data.student_name} session=${data.session_id}`);
  });

  // ── NEW: Live snapshot from student webcam ─────────────────
  socket.on('student_snapshot', (data) => {
    // Forward to all monitors watching this exam
    io.to(`monitor_${data.exam_id}`).emit('student_snapshot', data);
  });

  // ── NEW: Student violation event ───────────────────────────
  socket.on('student_violation', (data) => {
    io.to(`monitor_${data.exam_id}`).emit('student_violation', data);
    io.to(`monitor_${data.exam_id}`).emit('new_violation', {
      ...data.violation,
      student_name:  data.student_name,
      session_id:    data.session_id,
      warning_count: data.warning_count,
    });
  });

  // ── NEW: Proctor terminates a student session ───────────────
  socket.on('terminate_session', (data) => {
    io.to(`session_${data.session_id}`).emit('terminate_session', data);
    logger.info(`Proctor terminated session ${data.session_id}`);
  });

  // ── NEW: Proctor sends a custom warning message ─────────────
  socket.on('proctor_warning', (data) => {
    io.to(`session_${data.session_id}`).emit('proctor_warning', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Attach io to app for use in controllers
app.set('io', io);

// ─── Error Handler (must be last) ────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`\n✅ API Server: http://localhost:${PORT}/api/health`);
  console.log(`✅ Socket.IO:  ws://localhost:${PORT}\n`);
});

module.exports = { app, io };
