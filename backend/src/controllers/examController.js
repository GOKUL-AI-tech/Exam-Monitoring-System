// Exam Management Controller
const pool = require('../config/database');
const logger = require('../config/logger');

// GET /api/exams — list exams based on role
const getExams = async (req, res, next) => {
  try {
    let query, params;

    const countSub = `(SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id)::int AS question_count,
               (SELECT COUNT(*) FROM exam_enrollments ee2 WHERE ee2.exam_id = e.id)::int AS enrolled_count`;

    if (req.user.role === 'main_admin') {
      query = `SELECT e.*, u.name as created_by_name, c.name as college_name,
               ${countSub}
               FROM exams e
               LEFT JOIN users u ON e.created_by = u.id
               LEFT JOIN colleges c ON e.college_id = c.id
               ORDER BY e.created_at DESC`;
      params = [];
    } else if (req.user.role === 'college_admin' || req.user.role === 'staff') {
      query = `SELECT e.*, u.name as created_by_name,
               ${countSub}
               FROM exams e
               LEFT JOIN users u ON e.created_by = u.id
               WHERE e.college_id = $1
               ORDER BY e.created_at DESC`;
      params = [req.user.college_id];
    } else {
      // Student: only enrolled exams
      query = `SELECT e.*, u.name as created_by_name,
               ${countSub}
               FROM exams e
               JOIN exam_enrollments ee ON e.id = ee.exam_id
               LEFT JOIN users u ON e.created_by = u.id
               WHERE ee.student_id = $1 AND e.is_published = TRUE
               ORDER BY e.start_time ASC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, exams: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/exams — create exam (staff/admin)
const createExam = async (req, res, next) => {
  try {
    const {
      title, description, subject, department,
      duration_minutes, total_marks, pass_marks,
      start_time, end_time, shuffle_questions,
      shuffle_options, proctoring_enabled
    } = req.body;

    const result = await pool.query(
      `INSERT INTO exams (college_id, created_by, title, description, subject, department,
        duration_minutes, total_marks, pass_marks, start_time, end_time,
        shuffle_questions, shuffle_options, proctoring_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.college_id, req.user.id, title, description, subject, department,
        duration_minutes || 60, total_marks || 100, pass_marks || 40,
        start_time, end_time,
        shuffle_questions !== false, shuffle_options !== false,
        proctoring_enabled !== false
      ]
    );

    logger.info(`Exam created: ${title} by ${req.user.email}`);
    res.status(201).json({ success: true, exam: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/exams/:id — get exam details
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT e.*, u.name as created_by_name, c.name as college_name
       FROM exams e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN colleges c ON e.college_id = c.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const exam = result.rows[0];

    // Fetch questions (hide correct_option for students)
    const qResult = await pool.query(
      `SELECT id, question_text, question_image_url, option_a, option_b, option_c, option_d,
              marks, difficulty, order_index
              ${req.user.role !== 'student' ? ', correct_option, explanation' : ''}
       FROM questions WHERE exam_id = $1 ORDER BY order_index`,
      [id]
    );

    exam.questions = qResult.rows;
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

// PUT /api/exams/:id — update exam
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, subject, department, duration_minutes,
            total_marks, pass_marks, start_time, end_time, is_published } = req.body;

    const result = await pool.query(
      `UPDATE exams SET title=$1, description=$2, subject=$3, department=$4,
        duration_minutes=$5, total_marks=$6, pass_marks=$7, start_time=$8,
        end_time=$9, is_published=$10, updated_at=NOW()
       WHERE id=$11 AND (college_id=$12 OR $13)
       RETURNING *`,
      [title, description, subject, department, duration_minutes,
       total_marks, pass_marks, start_time, end_time, is_published,
       id, req.user.college_id, req.user.role === 'main_admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found or unauthorized' });
    }

    res.json({ success: true, exam: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/exams/:id
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Staff can only delete their own exams; admin can delete any
    const condition = req.user.role === 'staff'
      ? 'id = $1 AND created_by = $2'
      : 'id = $1';
    const params = req.user.role === 'staff' ? [id, req.user.id] : [id];
    const result = await pool.query(`DELETE FROM exams WHERE ${condition} RETURNING id`, params);
    if (result.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Exam not found or you do not have permission to delete it' });
    }
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/exams/:id/enroll — enroll students
const enrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { student_ids } = req.body; // array of student UUIDs

    const values = student_ids.map((sid) => `('${id}', '${sid}')`).join(',');
    await pool.query(
      `INSERT INTO exam_enrollments (exam_id, student_id) VALUES ${values} ON CONFLICT DO NOTHING`
    );

    res.json({ success: true, message: `${student_ids.length} students enrolled` });
  } catch (err) {
    next(err);
  }
};

// GET /api/exams/:id/results — get results for an exam
const getExamResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.name as student_name, u.roll_number, u.email as student_email
       FROM results r
       JOIN users u ON r.student_id = u.id
       WHERE r.exam_id = $1
       ORDER BY r.marks_obtained DESC`,
      [id]
    );
    res.json({ success: true, results: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getExams, createExam, getExamById, updateExam, deleteExam, enrollStudents, getExamResults };
