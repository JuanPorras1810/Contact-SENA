const express = require('express');
const { listSupervisorTimes, listAgentTimes } = require('../controllers/timeController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/supervisor', authenticate, requireRole('supervisor'), asyncHandler(listSupervisorTimes));
router.get('/agente', authenticate, requireRole('agente'), asyncHandler(listAgentTimes));
module.exports = router;
