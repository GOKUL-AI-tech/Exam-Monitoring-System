const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser, getStudentResults, getStudentViolations, getDashboardStats } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/', authenticate, authorize('main_admin', 'college_admin', 'staff'), getUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, authorize('main_admin', 'college_admin'), updateUser);
router.delete('/:id', authenticate, authorize('main_admin', 'college_admin', 'staff'), deleteUser);
router.get('/:id/results', authenticate, getStudentResults);
router.get('/:id/violations', authenticate, authorize('main_admin', 'college_admin', 'staff'), getStudentViolations);

module.exports = router;
