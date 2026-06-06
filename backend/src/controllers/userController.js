// User Management Controller
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// GET /api/users — list users (filtered by role)
const getUsers = async (req, res, next) => {
  try {
    const { role, college_id } = req.query;
    let query = 'SELECT id, name, email, role, college_id, roll_number, department, phone, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (req.user.role !== 'main_admin') {
      params.push(req.user.college_id);
      query += ` AND college_id=$${params.length}`;
    } else if (college_id) {
      params.push(college_id);
      query += ` AND college_id=$${params.length}`;
    }

    if (role) {
      params.push(role);
      query += ` AND role=$${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, college_id, roll_number, department, phone, is_active, created_at FROM users WHERE id=$1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id — update user
const updateUser = async (req, res, next) => {
  try {
    const { name, phone, department, is_active } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, phone=$2, department=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING id,name,email,role',
      [name, phone, department, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id — soft delete (deactivate)
const deleteUser = async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/results — student results
const getStudentResults = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, e.title as exam_title, e.subject
       FROM results r
       JOIN exams e ON r.exam_id = e.id
       WHERE r.student_id=$1
       ORDER BY r.calculated_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, results: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/violations — student violations
const getStudentViolations = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT v.*, e.title as exam_title
       FROM violations v
       JOIN exams e ON v.exam_id = e.id
       WHERE v.student_id=$1
       ORDER BY v.timestamp DESC`,
      [req.params.id]
    );
    res.json({ success: true, violations: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/stats — role-based dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const collegeFilter = req.user.role !== 'main_admin'
      ? `AND college_id='${req.user.college_id}'` : '';

    const [colleges, users, exams, sessions] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM colleges WHERE is_active=TRUE'),
      pool.query(`SELECT COUNT(*) FROM users WHERE is_active=TRUE ${req.user.role !== 'main_admin' ? `AND college_id='${req.user.college_id}'` : ''}`),
      pool.query(`SELECT COUNT(*) FROM exams WHERE 1=1 ${collegeFilter}`),
      pool.query(`SELECT COUNT(*) FROM exam_sessions WHERE is_submitted=TRUE`)
    ]);

    res.json({
      success: true,
      stats: {
        total_colleges: parseInt(colleges.rows[0].count),
        total_users: parseInt(users.rows[0].count),
        total_exams: parseInt(exams.rows[0].count),
        total_submissions: parseInt(sessions.rows[0].count)
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser, getStudentResults, getStudentViolations, getDashboardStats };
