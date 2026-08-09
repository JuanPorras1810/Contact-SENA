const express = require('express');
const { login, logout, profile, patchProfile } = require('../controllers/authController');
const { asyncHandler } = require('../utils/http');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.post('/login', asyncHandler(login));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/profile', authenticate, asyncHandler(profile));
router.patch('/profile', authenticate, asyncHandler(patchProfile));
module.exports = router;
