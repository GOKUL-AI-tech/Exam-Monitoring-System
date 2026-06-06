const express = require('express');
const router = express.Router();
const { login, register, getMe, changePassword } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', authenticate, authorize('main_admin', 'college_admin', 'staff'), register);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
