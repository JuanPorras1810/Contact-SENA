const express = require('express');
const { obtenerGeografia, obtenerOperativos } = require('../controllers/catalogController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.get('/geografia', autenticar, manejadorAsincrono(obtenerGeografia));
router.get('/operativos', autenticar, manejadorAsincrono(obtenerOperativos));
module.exports = router;
