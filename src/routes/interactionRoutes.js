const express = require('express');
const { catalogs, today, postInteraction } = require('../controllers/interactionController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/catalogos', authenticate, requireRole('agente'), asyncHandler(catalogs));
router.get('/hoy', authenticate, requireRole('agente'), asyncHandler(today));
router.post('/', authenticate, requireRole('agente'), asyncHandler(postInteraction));
module.exports = router;
