// College Management Controller (Main Admin only)
const pool = require('../config/database');

// GET /api/colleges
const getColleges = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(u.id) as total_users
       FROM colleges c
       LEFT JOIN users u ON c.id = u.college_id AND u.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, colleges: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/colleges
const createCollege = async (req, res, next) => {
  try {
    const { name, code, address, phone, email } = req.body;
    const result = await pool.query(
      'INSERT INTO colleges (name, code, address, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, code, address, phone, email]
    );
    res.status(201).json({ success: true, college: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/colleges/:id
const updateCollege = async (req, res, next) => {
  try {
    const { name, code, address, phone, email, is_active } = req.body;
    const result = await pool.query(
      'UPDATE colleges SET name=$1,code=$2,address=$3,phone=$4,email=$5,is_active=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, code, address, phone, email, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }
    res.json({ success: true, college: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/colleges/:id
const deleteCollege = async (req, res, next) => {
  try {
    await pool.query('UPDATE colleges SET is_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'College deactivated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getColleges, createCollege, updateCollege, deleteCollege };
