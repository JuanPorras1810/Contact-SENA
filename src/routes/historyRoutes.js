const express = require('express');
const { obtenerHistorial, obtenerHistorialAgente } = require('../controllers/historyController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerHistorial));
router.get('/agente', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerHistorialAgente));
module.exports = router;
