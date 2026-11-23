const express = require('express');
const { obtenerClientes, obtenerClientesAsignados, crearCliente, importarClientesCsv, actualizarCliente } = require('../controllers/clientController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar, requerirRol } = require('../middleware/auth');
const { uploadClientCsv } = require('../middleware/clientCsvUpload');

const router = express.Router();
router.get('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(obtenerClientes));
router.get('/asignados', autenticar, requerirRol('agente'), manejadorAsincrono(obtenerClientesAsignados));
router.post('/', autenticar, requerirRol('supervisor'), manejadorAsincrono(crearCliente));
router.post('/importar-csv', autenticar, requerirRol('supervisor'), uploadClientCsv.single('file'), manejadorAsincrono(importarClientesCsv));
router.patch('/:id', autenticar, requerirRol('supervisor'), manejadorAsincrono(actualizarCliente));
module.exports = router;
