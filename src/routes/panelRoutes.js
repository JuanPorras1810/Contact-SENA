const express = require('express');
const { getPanel } = require('../controllers/panelController');
const { postAssignment } = require('../controllers/assignmentController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getPanel));
router.post('/asignaciones', authenticate, requireRole('supervisor'), asyncHandler(postAssignment));
module.exports = router;
