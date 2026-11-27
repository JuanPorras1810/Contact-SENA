const express = require('express');
const {
    obtenerTipificaciones,
    obtenerEstadosCaso,
    crear,
    actualizar,
    eliminar
} = require('../controllers/tipificationController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
const supervisor = [autenticar, requerirRol('supervisor')];

router.get('/', ...supervisor, manejadorAsincrono(obtenerTipificaciones));
router.get('/estados', ...supervisor, manejadorAsincrono(obtenerEstadosCaso));
router.post('/', ...supervisor, manejadorAsincrono(crear));
router.put('/:id', ...supervisor, manejadorAsincrono(actualizar));
router.delete('/:id', ...supervisor, manejadorAsincrono(eliminar));

module.exports = router;
