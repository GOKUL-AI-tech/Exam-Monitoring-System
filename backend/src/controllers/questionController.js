// Question Management Controller
const pool = require('../config/database');

// POST /api/exams/:examId/questions — add single question
const addQuestion = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { question_text, option_a, option_b, option_c, option_d,
            correct_option, marks, difficulty, explanation, order_index } = req.body;

    const result = await pool.query(
      `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, difficulty, explanation, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [examId, question_text, option_a, option_b, option_c, option_d,
       correct_option.toUpperCase(), marks || 1, difficulty || 'medium', explanation, order_index || 0]
    );

    res.status(201).json({ success: true, question: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/exams/:examId/questions/bulk — upload MCQs in bulk
const bulkAddQuestions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { questions } = req.body; // Array of question objects

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Questions array is required' });
    }

    const values = questions.map((q, idx) =>
      `('${examId}', $${idx * 10 + 1}, $${idx * 10 + 2}, $${idx * 10 + 3},
        $${idx * 10 + 4}, $${idx * 10 + 5}, $${idx * 10 + 6},
        $${idx * 10 + 7}, $${idx * 10 + 8}, $${idx * 10 + 9}, $${idx * 10 + 10})`
    ).join(',');

    const params = questions.flatMap((q, idx) => [
      q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.correct_option.toUpperCase(), q.marks || 1,
      q.difficulty || 'medium', q.explanation || null, idx
    ]);

    await pool.query(
      `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d,
        correct_option, marks, difficulty, explanation, order_index) VALUES ${values}`,
      params
    );

    res.status(201).json({ success: true, added: questions.length, message: `${questions.length} questions added` });
  } catch (err) {
    next(err);
  }
};

// PUT /api/questions/:id — update question
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question_text, option_a, option_b, option_c, option_d,
            correct_option, marks, difficulty, explanation } = req.body;

    const result = await pool.query(
      `UPDATE questions SET question_text=$1, option_a=$2, option_b=$3,
        option_c=$4, option_d=$5, correct_option=$6, marks=$7,
        difficulty=$8, explanation=$9 WHERE id=$10 RETURNING *`,
      [question_text, option_a, option_b, option_c, option_d,
       correct_option.toUpperCase(), marks, difficulty, explanation, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/questions/:id
const deleteQuestion = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addQuestion, bulkAddQuestions, updateQuestion, deleteQuestion };
