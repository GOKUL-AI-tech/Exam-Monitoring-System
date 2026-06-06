// Authentication Controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../config/logger');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, college_id: user.college_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Fetch user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [user.id, 'LOGIN', req.ip]
    );

    logger.info(`User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        college_id: user.college_id,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register (for students via college admin)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, college_id, roll_number, department, phone } = req.body;

    // Only main_admin can create college_admin; college_admin can create staff/student
    const allowedRoles = {
      main_admin: ['college_admin', 'staff', 'student'],
      college_admin: ['staff', 'student'],
      staff: ['student']
    };

    if (!allowedRoles[req.user.role]?.includes(role)) {
      return res.status(403).json({ success: false, message: `Cannot create user with role: ${role}` });
    }

    // Check if email already exists
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, college_id, roll_number, department, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role`,
      [name, email.toLowerCase(), password_hash, role, college_id || req.user.college_id, roll_number, department, phone]
    );

    logger.info(`New user created: ${email} as ${role}`);
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, result.rows[0].password_hash);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const new_hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getMe, changePassword };
