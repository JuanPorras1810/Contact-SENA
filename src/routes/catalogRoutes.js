const express = require('express');
const { geography } = require('../controllers/catalogController');
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.get('/geografia', authenticate, asyncHandler(geography));
module.exports = router;
