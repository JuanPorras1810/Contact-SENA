const express = require('express');
const { obtenerCampanas, obtenerTipificaciones, crearCampana, actualizarCampana } = require('../controllers/campaignController');
const { manejadorAsincrono } = require('../utils/http');
const { uploadCampaignPdf } = require('../middleware/campaignUpload');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerCampanas));
router.post('/', autenticar, requerirRol('supervisor'), uploadCampaignPdf.single('file'), manejadorAsincrono(crearCampana));
router.patch('/:id', autenticar, requerirRol('supervisor'), uploadCampaignPdf.single('file'), manejadorAsincrono(actualizarCampana));
router.get('/:id/tipificaciones', autenticar, requerirRol('agente', 'supervisor'), manejadorAsincrono(obtenerTipificaciones));
module.exports = router;
