const express = require('express');
const { listarTiemposSupervisor, listarTiemposAgente } = require('../controllers/timeController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/supervisor', autenticar, requerirRol('supervisor'), manejadorAsincrono(listarTiemposSupervisor));
router.get('/agente', autenticar, requerirRol('agente'), manejadorAsincrono(listarTiemposAgente));
module.exports = router;
