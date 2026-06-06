/**
 * importController.js  — Question file import
 *
 * Supported formats:
 *   .docx  — Word document  (mammoth text extraction)
 *   .pdf   — PDF document   (pdf-parse text extraction)
 *   .xlsx / .xls / .csv — Spreadsheet (xlsx library)
 *
 * MCQ text format recognised (Word / PDF):
 *
 *   1. What is the capital of France?        (or  "Q1." / "1)" / "Question 1:")
 *   A. Paris                                 (or  "A)" / "(A)" / "a.")
 *   B. London
 *   C. Berlin
 *   D. Madrid
 *   Answer: A                                (or  "Correct: A" / "Ans: A" / "Answer - A")
 *   [Marks: 2]                               (optional)
 *   [Difficulty: easy]                       (optional)
 *
 * Spreadsheet column order:
 *   Question | Option A | Option B | Option C | Option D | Correct (A-D) | Marks | Difficulty
 */

const pool   = require('../config/database');
const logger = require('../config/logger');
const path   = require('path');
const fs     = require('fs');

// ─────────────────────────────────────────────────────────────
//  TEXT PARSER  (shared by Word + PDF flows)
// ─────────────────────────────────────────────────────────────
function parseQuestionsFromText(rawText) {
  // Normalise line endings and collapse blank lines to single blank
  const text  = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim());

  const questions = [];
  let cur = null;

  const flushCurrent = () => {
    if (cur && cur.question_text && cur.option_a && cur.option_b) {
      // Fill missing options with placeholder so DB doesn't reject
      if (!cur.option_c) cur.option_c = '—';
      if (!cur.option_d) cur.option_d = '—';
      questions.push(cur);
    }
    cur = null;
  };

  const newQuestion = (text) => {
    flushCurrent();
    cur = {
      question_text: text,
      option_a: '', option_b: '', option_c: '', option_d: '',
      correct_option: 'A',
      marks: 1,
      difficulty: 'medium',
    };
  };

  // Regex patterns
  const RE_QNUM    = /^(?:Q(?:uestion)?\s*\.?\s*)?(\d+)\s*[.):]\s+(.+)/i;
  const RE_OPT     = /^\(?([A-Da-d])\)?[.):\-]\s+(.+)/;
  const RE_ANSWER  = /^(?:answer|ans|correct(?:\s+answer)?|key)\s*[:\-]\s*([A-Da-d])/i;
  const RE_MARKS   = /^(?:marks?|points?)\s*[:\-]\s*(\d+)/i;
  const RE_DIFF    = /^(?:difficulty|level)\s*[:\-]\s*(easy|medium|hard)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const qMatch = line.match(RE_QNUM);
    if (qMatch) {
      // Start a new question; may span multiple lines until next number
      let qText = qMatch[2].trim();
      // Peek ahead for continuation lines (no option prefix, no number)
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (!next || next.match(RE_QNUM) || next.match(RE_OPT) || next.match(RE_ANSWER)) break;
        qText += ' ' + next;
        i++;
      }
      newQuestion(qText);
      continue;
    }

    if (!cur) continue; // haven't seen first question yet

    const optMatch = line.match(RE_OPT);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      let   val    = optMatch[2].trim();
      // Allow multi-line options
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (!next || next.match(RE_QNUM) || next.match(RE_OPT) || next.match(RE_ANSWER)) break;
        val += ' ' + next;
        i++;
      }
      const key = `option_${letter.toLowerCase()}`;
      if (key in cur) cur[key] = val;
      continue;
    }

    const ansMatch = line.match(RE_ANSWER);
    if (ansMatch) {
      cur.correct_option = ansMatch[1].toUpperCase();
      continue;
    }

    const marksMatch = line.match(RE_MARKS);
    if (marksMatch) {
      cur.marks = parseInt(marksMatch[1]) || 1;
      continue;
    }

    const diffMatch = line.match(RE_DIFF);
    if (diffMatch) {
      cur.difficulty = diffMatch[1].toLowerCase();
      continue;
    }
  }

  flushCurrent();
  return questions;
}

// ─────────────────────────────────────────────────────────────
//  FORMAT-SPECIFIC PARSERS
// ─────────────────────────────────────────────────────────────
async function parseWord(filePath) {
  const mammoth = require('mammoth');

  // Try to extract styled text first (preserves bold headings etc.)
  let result;
  try {
    result = await mammoth.extractRawText({ path: filePath });
  } catch {
    result = await mammoth.convert({ path: filePath });
  }

  return parseQuestionsFromText(result.value || '');
}

async function parsePDF(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer, {
    // Return plain text; disable rendering hints that add noise
    pagerender: null,
  });
  return parseQuestionsFromText(data.text || '');
}

function parseSpreadsheet(filePath) {
  const XLSX  = require('xlsx');
  const wb    = XLSX.readFile(filePath);
  const ws    = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Auto-detect header row: skip rows until a cell contains "question"
  let startIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i].some(c => /question/i.test(String(c)))) { startIdx = i + 1; break; }
  }
  if (startIdx === 0 && rows.length > 1) startIdx = 1; // fallback: skip first row

  return rows.slice(startIdx)
    .filter(r => r[0] && String(r[0]).trim())
    .map(r => ({
      question_text:  String(r[0] || '').trim(),
      option_a:       String(r[1] || '').trim(),
      option_b:       String(r[2] || '').trim(),
      option_c:       String(r[3] || '').trim() || '—',
      option_d:       String(r[4] || '').trim() || '—',
      correct_option: String(r[5] || 'A').trim().toUpperCase().charAt(0),
      marks:          parseInt(r[6])  || 1,
      difficulty:     ['easy','medium','hard'].includes(String(r[7]).toLowerCase())
                        ? String(r[7]).toLowerCase() : 'medium',
    }));
}

// ─────────────────────────────────────────────────────────────
//  VALIDATION
// ─────────────────────────────────────────────────────────────
function validateQuestions(questions) {
  const errors = [];
  questions.forEach((q, i) => {
    const row = i + 1;
    if (!q.question_text)                             errors.push(`Q${row}: question text is empty`);
    if (!q.option_a || !q.option_b)                   errors.push(`Q${row}: at least options A and B are required`);
    if (!['A','B','C','D'].includes(q.correct_option)) errors.push(`Q${row}: correct_option must be A, B, C, or D`);
  });
  return errors;
}

// ─────────────────────────────────────────────────────────────
//  POST /api/exams/:examId/import  — main handler
// ─────────────────────────────────────────────────────────────
const importQuestions = async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const ext  = path.extname(req.file.originalname).toLowerCase();
    let questions = [];

    if (ext === '.docx')                              questions = await parseWord(filePath);
    else if (ext === '.pdf')                          questions = await parsePDF(filePath);
    else if (['.xlsx','.xls','.csv'].includes(ext))   questions = parseSpreadsheet(filePath);
    else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Unsupported file. Use .docx, .pdf, .xlsx, .xls, or .csv' });
    }

    // Clean up temp file immediately
    fs.unlinkSync(filePath);

    if (questions.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No questions could be parsed from the file. Check the format guide.',
        hint: ext === '.pdf' || ext === '.docx'
          ? 'Each question must start with a number (e.g. "1.") and options with A-D.'
          : 'Check column order: Question | Opt A | Opt B | Opt C | Opt D | Correct | Marks | Difficulty',
      });
    }

    const errors = validateQuestions(questions);
    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `${errors.length} validation error(s) found`,
        errors,
        questions, // return partial data so frontend can show preview
      });
    }

    // ── PREVIEW mode: ?preview=1 returns without writing to DB ──
    if (req.query.preview === '1') {
      return res.json({ success: true, preview: true, count: questions.length, questions });
    }

    // ── IMPORT: bulk insert into DB ──
    const { examId } = req.params;

    // Get current max order_index
    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(order_index),0) AS mx FROM questions WHERE exam_id=$1',
      [examId]
    );
    let orderStart = (maxRes.rows[0]?.mx || 0) + 1;

    // Build parameterised query
    const colCount = 10; // columns per row (includes difficulty)
    const valuesSql = questions.map((_, i) => {
      const base = i * colCount;
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10})`;
    }).join(',');

    const params = questions.flatMap((q, i) => [
      examId,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.marks,
      q.difficulty || 'medium',
      orderStart + i,
    ]);

    await pool.query(`
      INSERT INTO questions
        (exam_id, question_text, option_a, option_b, option_c, option_d,
         correct_option, marks, difficulty, order_index)
      VALUES ${valuesSql}
    `, params);

    logger.info(`Imported ${questions.length} questions into exam ${examId}`);
    res.json({ success: true, imported: questions.length, questions });

  } catch (err) {
    if (filePath) { try { fs.unlinkSync(filePath); } catch {} }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/exams/:examId/import/template
// ─────────────────────────────────────────────────────────────
const downloadTemplate = (req, res) => {
  const XLSX = require('xlsx');

  const headers = [[
    'Question Text',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct (A/B/C/D)',
    'Marks',
    'Difficulty (easy/medium/hard)',
  ]];
  const samples = [
    ['What does CPU stand for?',             'Central Processing Unit','Computer Personal Unit','Central Program Unit','Core Processing Utility', 'A', 1, 'easy'],
    ['Which data structure uses LIFO?',      'Queue','Stack','Array','Tree',                                                                       'B', 1, 'medium'],
    ['What is the time complexity of binary search?', 'O(n)','O(n²)','O(log n)','O(1)',                                                           'C', 2, 'hard'],
    ['HTTP status 404 means:',               'Server Error','Not Found','Forbidden','OK',                                                          'B', 1, 'easy'],
  ];

  const ws  = XLSX.utils.aoa_to_sheet([...headers, ...samples]);
  ws['!cols'] = [{wch:45},{wch:28},{wch:28},{wch:28},{wch:28},{wch:18},{wch:8},{wch:28}];

  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="question_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

// ─────────────────────────────────────────────────────────────
//  GET /api/exams/:examId/import/word-template
// ─────────────────────────────────────────────────────────────
const downloadWordTemplate = (req, res) => {
  const sample = `EXAM QUESTION TEMPLATE
======================
Use this format in your Word or PDF document.

1. What does CPU stand for?
A. Central Processing Unit
B. Computer Personal Unit
C. Central Program Unit
D. Core Processing Utility
Answer: A
Marks: 1
Difficulty: easy

2. Which data structure uses the LIFO principle?
A. Queue
B. Stack
C. Array
D. Linked List
Answer: B
Marks: 1
Difficulty: medium

3. What is the time complexity of Binary Search?
A. O(n)
B. O(n log n)
C. O(log n)
D. O(n²)
Answer: C
Marks: 2
Difficulty: hard

RULES:
- Each question must start with a number followed by a period or bracket: "1." or "1)"
- Options must be labeled A, B, C, D (uppercase or lowercase) followed by a period, bracket, or dash
- Include "Answer: X" (or "Ans: X" / "Correct: X") to set the correct option
- Marks and Difficulty lines are optional (defaults: 1 mark, medium difficulty)
- You can use .docx (Word) or .pdf format
`;

  res.setHeader('Content-Disposition', 'attachment; filename="question_format_guide.txt"');
  res.setHeader('Content-Type', 'text/plain');
  res.send(sample);
};

module.exports = { importQuestions, downloadTemplate, downloadWordTemplate };
