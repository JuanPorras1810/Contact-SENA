const express = require('express');
const { getClients, getAssignedClients, postClient } = require('../controllers/clientController');
const { asyncHandler } = require('../utils/http');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getClients));
router.get('/asignados', authenticate, requireRole('agente'), asyncHandler(getAssignedClients));
router.post('/', authenticate, requireRole('supervisor'), asyncHandler(postClient));
module.exports = router;
