// Main router — mounts all sub-routes
const express = require('express');
const router = express.Router();

const authRoutes   = require('./authRoutes');
const examRoutes   = require('./examRoutes');
const questionRoutes = require('./questionRoutes');
const sessionRoutes  = require('./sessionRoutes');
const userRoutes   = require('./userRoutes');
const collegeRoutes  = require('./collegeRoutes');
const importRoutes   = require('./importRoutes');

router.use('/auth',      authRoutes);
router.use('/exams',     examRoutes);
router.use('/questions', questionRoutes);
router.use('/sessions',  sessionRoutes);
router.use('/users',     userRoutes);
router.use('/colleges',  collegeRoutes);
router.use('/',          importRoutes);

module.exports = router;
