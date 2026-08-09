const express = require('express');
const { getAdvisors } = require('../controllers/advisorController');
const { postAgent } = require('../controllers/agentController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getAdvisors));
router.post('/', authenticate, requireRole('supervisor'), asyncHandler(postAgent));
module.exports = router;
