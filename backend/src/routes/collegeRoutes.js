const express = require('express');
const router = express.Router();
const { getColleges, createCollege, updateCollege, deleteCollege } = require('../controllers/collegeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('main_admin'), getColleges);
router.post('/', authenticate, authorize('main_admin'), createCollege);
router.put('/:id', authenticate, authorize('main_admin'), updateCollege);
router.delete('/:id', authenticate, authorize('main_admin'), deleteCollege);

module.exports = router;
