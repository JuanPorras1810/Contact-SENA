const express = require('express');
const { obtenerCatalogos, obtenerHoy, crearInteraccion, obtenerCasosAgente, obtenerTrazabilidad, guardarSeguimiento } = require('../controllers/interactionController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/catalogos', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerCatalogos));
router.get('/hoy', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerHoy));
router.get('/casos', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerCasosAgente));
router.get('/cliente/:conCli/trazabilidad', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerTrazabilidad));
router.post('/casos/:id/seguimiento', autenticar, requerirRol('agente'), manejadorAsincrono(guardarSeguimiento));
router.post('/', autenticar, requerirRol('agente'), manejadorAsincrono(crearInteraccion));
module.exports = router;
