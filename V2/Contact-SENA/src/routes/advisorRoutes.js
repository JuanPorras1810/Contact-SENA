const express = require('express');
const { obtenerAsesores } = require('../controllers/advisorController');
const { crearAgente, actualizarAgente } = require('../controllers/agentController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerAsesores));
router.post('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(crearAgente));
router.patch('/:id', autenticar, requerirRol('supervisor'), manejadorAsincrono(actualizarAgente));
module.exports = router;
