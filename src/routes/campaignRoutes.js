const express = require('express');
const { getCampaigns, getTypifications, postCampaign } = require('../controllers/campaignController');
const { asyncHandler } = require('../utils/http');
const { uploadCampaignPdf } = require('../middleware/campaignUpload');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, requireRole('supervisor'), asyncHandler(getCampaigns));
router.post('/', authenticate, requireRole('supervisor'), uploadCampaignPdf.single('file'), asyncHandler(postCampaign));
router.get('/:id/tipificaciones', authenticate, requireRole('agente'), asyncHandler(getTypifications));
module.exports = router;
