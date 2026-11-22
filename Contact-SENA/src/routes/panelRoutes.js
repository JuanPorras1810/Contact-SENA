const express = require('express');
const { obtenerPanel } = require('../controllers/panelController');
const { crearAsignacion, actualizarAsignacion } = require('../controllers/assignmentController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerPanel));
router.post('/asignaciones', autenticar, requerirRol('supervisor'), manejadorAsincrono(crearAsignacion));
router.patch('/asignaciones/:id', autenticar, requerirRol('supervisor'), manejadorAsincrono(actualizarAsignacion));
module.exports = router;
