const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { importQuestions, downloadTemplate, downloadWordTemplate } = require('../controllers/importController');
const { authenticate, authorize } = require('../middleware/auth');

const ALLOWED_STAFF = ['main_admin','college_admin','staff'];

// ── Multer storage ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/imports');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx','.xls','.csv','.docx','.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Only ${allowed.join(', ')} files are allowed`));
  },
});

// Templates
router.get('/exams/:examId/import/template',      authenticate, authorize(...ALLOWED_STAFF), downloadTemplate);
router.get('/exams/:examId/import/word-template',  authenticate, authorize(...ALLOWED_STAFF), downloadWordTemplate);

// Import (supports ?preview=1 to parse without saving)
router.post('/exams/:examId/import',               authenticate, authorize(...ALLOWED_STAFF), upload.single('file'), importQuestions);

module.exports = router;
