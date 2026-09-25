const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const universityController = require('../controllers/universityController');
const evaluationController = require('../controllers/universityEvaluationController');
router.use(authenticate);
router.use(authorizeRoles('UNIVERSITY'));

router.get('/me/dashboard', universityController.getDashboardCounts);
router.get('/me/faculty-students', universityController.getFacultyAndStudents);

router.get('/challenges', evaluationController.getMatchedChallenges);
router.get('/challenges/:problemId/evaluation', evaluationController.getEvaluation);
router.post('/challenges/:problemId/evaluation', evaluationController.createEvaluation);
router.patch('/challenges/:problemId/evaluation', evaluationController.updateEvaluation);

module.exports = router;
