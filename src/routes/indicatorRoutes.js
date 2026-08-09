const express = require('express');
const { getIndicatorData } = require('../controllers/indicatorController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getIndicatorData));
module.exports = router;
