const express = require('express');
const router  = express.Router();
const {
  startSession, saveAnswer, submitSession,
  getSessionAnswers, logViolation,
  terminateSession, getSessionViolations,
} = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/start',                  authenticate, authorize('student'),                             startSession);
router.post('/:sessionId/answer',      authenticate, authorize('student'),                             saveAnswer);
router.post('/:sessionId/submit',      authenticate, authorize('student'),                             submitSession);
router.get('/:sessionId/answers',      authenticate,                                                   getSessionAnswers);
router.post('/:sessionId/violation',   authenticate,                                                   logViolation);
router.post('/:sessionId/terminate',   authenticate, authorize('staff','college_admin','main_admin'), terminateSession);
router.get('/:sessionId/violations',   authenticate,                                                   getSessionViolations);

module.exports = router;
