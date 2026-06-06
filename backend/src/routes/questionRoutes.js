const express = require('express');
const router = express.Router();
const { updateQuestion, deleteQuestion } = require('../controllers/questionController');
const { authenticate, authorize } = require('../middleware/auth');

router.put('/:id', authenticate, authorize('main_admin', 'college_admin', 'staff'), updateQuestion);
router.delete('/:id', authenticate, authorize('main_admin', 'college_admin', 'staff'), deleteQuestion);

module.exports = router;
