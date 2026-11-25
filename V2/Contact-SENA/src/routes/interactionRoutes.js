const express = require('express');
const { obtenerCatalogos, obtenerHoy, crearInteraccion } = require('../controllers/interactionController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/catalogos', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerCatalogos));
router.get('/hoy', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerHoy));
router.post('/', autenticar, requerirRol('agente'), manejadorAsincrono(crearInteraccion));
module.exports = router;
