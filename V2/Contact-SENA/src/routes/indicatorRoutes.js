const express = require('express');
const { obtenerDatosIndicadores } = require('../controllers/indicatorController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerDatosIndicadores));
module.exports = router;
