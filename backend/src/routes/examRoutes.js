const express = require('express');
const router = express.Router();
const { getExams, createExam, getExamById, updateExam, deleteExam, enrollStudents, getExamResults } = require('../controllers/examController');
const { addQuestion, bulkAddQuestions } = require('../controllers/questionController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getExams);
router.post('/', authenticate, authorize('main_admin', 'college_admin', 'staff'), createExam);
router.get('/:id', authenticate, getExamById);
router.put('/:id', authenticate, authorize('main_admin', 'college_admin', 'staff'), updateExam);
router.delete('/:id', authenticate, authorize('main_admin', 'college_admin', 'staff'), deleteExam);
router.post('/:id/enroll', authenticate, authorize('main_admin', 'college_admin', 'staff'), enrollStudents);
router.get('/:id/results', authenticate, authorize('main_admin', 'college_admin', 'staff'), getExamResults);

// Questions nested under exams
router.post('/:examId/questions', authenticate, authorize('main_admin', 'college_admin', 'staff'), addQuestion);
router.post('/:examId/questions/bulk', authenticate, authorize('main_admin', 'college_admin', 'staff'), bulkAddQuestions);

module.exports = router;
