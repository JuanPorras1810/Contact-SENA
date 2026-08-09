const express = require('express');
const { getHistory, getAgentHistory } = require('../controllers/historyController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getHistory));
router.get('/agente', authenticate, requireRole('agente'), asyncHandler(getAgentHistory));
module.exports = router;
