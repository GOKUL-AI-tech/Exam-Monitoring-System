// Exam Session Controller — handles student exam-taking
const pool = require('../config/database');
const logger = require('../config/logger');

// POST /api/sessions/start — student starts an exam
const startSession = async (req, res, next) => {
  try {
    const { exam_id } = req.body;
    const student_id = req.user.id;

    // Check enrollment
    const enrolled = await pool.query(
      'SELECT id FROM exam_enrollments WHERE exam_id=$1 AND student_id=$2',
      [exam_id, student_id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this exam' });
    }

    // Check if exam is active
    const examResult = await pool.query(
      'SELECT * FROM exams WHERE id=$1 AND is_published=TRUE AND start_time<=NOW() AND end_time>=NOW()',
      [exam_id]
    );
    if (examResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }

    // Check for existing session
    const existing = await pool.query(
      'SELECT * FROM exam_sessions WHERE exam_id=$1 AND student_id=$2',
      [exam_id, student_id]
    );

    if (existing.rows.length > 0) {
      const session = existing.rows[0];
      if (session.is_submitted) {
        return res.status(400).json({ success: false, message: 'Exam already submitted' });
      }
      // Resume existing session
      return res.json({ success: true, session, resumed: true });
    }

    // Create new session
    const session = await pool.query(
      `INSERT INTO exam_sessions (exam_id, student_id, ip_address, browser_info)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [exam_id, student_id, req.ip, req.headers['user-agent']]
    );

    logger.info(`Exam session started: student=${student_id} exam=${exam_id}`);
    res.status(201).json({ success: true, session: session.rows[0], resumed: false });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:sessionId/answer — save an answer
const saveAnswer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { question_id, selected_option } = req.body;

    // Verify session belongs to student
    const sessionCheck = await pool.query(
      'SELECT * FROM exam_sessions WHERE id=$1 AND student_id=$2 AND is_submitted=FALSE',
      [sessionId, req.user.id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Session not found or already submitted' });
    }

    // Upsert answer
    await pool.query(
      `INSERT INTO student_answers (session_id, question_id, selected_option)
       VALUES ($1,$2,$3)
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET selected_option=$3, answered_at=NOW()`,
      [sessionId, question_id, selected_option?.toUpperCase() || null]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:sessionId/submit — submit exam
const submitSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const sessionResult = await pool.query(
      'SELECT * FROM exam_sessions WHERE id=$1 AND student_id=$2',
      [sessionId, req.user.id]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessionResult.rows[0];
    if (session.is_submitted) {
      return res.status(400).json({ success: false, message: 'Already submitted' });
    }

    // Get all answers and evaluate
    const answersResult = await pool.query(
      `SELECT sa.question_id, sa.selected_option, q.correct_option, q.marks
       FROM student_answers sa
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.session_id = $1`,
      [sessionId]
    );

    // Get total questions
    const totalQResult = await pool.query(
      'SELECT COUNT(*) as count, SUM(marks) as total_marks FROM questions WHERE exam_id=$1',
      [session.exam_id]
    );

    const totalQuestions = parseInt(totalQResult.rows[0].count);
    const totalMarks = parseInt(totalQResult.rows[0].total_marks);

    let correct = 0, wrong = 0, marksObtained = 0;

    // Evaluate each answer and update
    for (const ans of answersResult.rows) {
      const isCorrect = ans.selected_option === ans.correct_option;
      const marksAwarded = isCorrect ? ans.marks : 0;

      if (ans.selected_option) {
        if (isCorrect) { correct++; marksObtained += marksAwarded; }
        else wrong++;
      }

      await pool.query(
        'UPDATE student_answers SET is_correct=$1, marks_awarded=$2 WHERE session_id=$3 AND question_id=$4',
        [isCorrect, marksAwarded, sessionId, ans.question_id]
      );
    }

    const attempted = answersResult.rows.filter(a => a.selected_option).length;
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;

    // Get exam pass marks
    const examResult = await pool.query('SELECT pass_marks FROM exams WHERE id=$1', [session.exam_id]);
    const isPassed = marksObtained >= examResult.rows[0].pass_marks;

    // Get violation count
    const violationsResult = await pool.query(
      'SELECT COUNT(*) as count FROM violations WHERE session_id=$1',
      [sessionId]
    );
    const violationCount = parseInt(violationsResult.rows[0].count);

    // Calculate grade
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    // Update session
    await pool.query(
      'UPDATE exam_sessions SET is_submitted=TRUE, submitted_at=NOW(), status=$1 WHERE id=$2',
      [req.body.auto_submit ? 'auto_submitted' : 'submitted', sessionId]
    );

    // Insert result
    const resultInsert = await pool.query(
      `INSERT INTO results (session_id, exam_id, student_id, total_questions, attempted_questions,
        correct_answers, wrong_answers, marks_obtained, total_marks, percentage, grade, is_passed, violation_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [sessionId, session.exam_id, req.user.id, totalQuestions, attempted,
       correct, wrong, marksObtained, totalMarks, percentage, grade, isPassed, violationCount]
    );

    logger.info(`Exam submitted: student=${req.user.id} session=${sessionId} score=${marksObtained}/${totalMarks}`);
    res.json({ success: true, result: resultInsert.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:sessionId/answers — get saved answers (for resume)
const getSessionAnswers = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'SELECT question_id, selected_option FROM student_answers WHERE session_id=$1',
      [sessionId]
    );
    res.json({ success: true, answers: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:sessionId/violation — log AI proctoring violation
const logViolation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { violation_type, severity, description, screenshot_url, confidence_score } = req.body;

    // Get exam_id from session
    const session = await pool.query('SELECT exam_id, student_id FROM exam_sessions WHERE id=$1', [sessionId]);
    if (session.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await pool.query(
      `INSERT INTO violations (session_id, student_id, exam_id, violation_type, severity, description, screenshot_url, confidence_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [sessionId, session.rows[0].student_id, session.rows[0].exam_id,
       violation_type, severity || 'medium', description, screenshot_url, confidence_score]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// (exports extended below with terminateSession + getSessionViolations)

// ── NEW: POST /api/sessions/:sessionId/terminate ──────────────
const terminateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { reason = 'Terminated by proctor' } = req.body;

    // Force-submit the session
    const updated = await pool.query(
      `UPDATE exam_sessions
       SET is_submitted=TRUE, submitted_at=NOW(), status='terminated'
       WHERE id=$1 AND is_submitted=FALSE
       RETURNING *`,
      [sessionId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found or already submitted' });
    }

    // Emit socket event to student
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('terminate_session', { session_id: sessionId, reason });
    }

    logger.info(`Session terminated by proctor: sessionId=${sessionId} reason=${reason}`);
    res.json({ success: true, message: 'Session terminated', session: updated.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── NEW: GET /api/sessions/:sessionId/violations ──────────────
const getSessionViolations = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT * FROM violations
       WHERE session_id=$1
       ORDER BY timestamp DESC
       LIMIT 200`,
      [sessionId]
    );
    res.json({ success: true, violations: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startSession, saveAnswer, submitSession, getSessionAnswers, logViolation,
  terminateSession, getSessionViolations,
};
