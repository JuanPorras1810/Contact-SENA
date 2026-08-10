const express = require('express');
const { iniciarSesion, cerrarSesion, obtenerPerfil, obtenerSesion, actualizarPerfil } = require('../controllers/authController');
const { manejadorAsincrono } = require('../utils/http');
const { autenticar } = require('../middleware/auth');
const { limitarLogin } = require('../middleware/rateLimit');

const router = express.Router();
router.post('/login', limitarLogin, manejadorAsincrono(iniciarSesion));
router.post('/logout', autenticar, manejadorAsincrono(cerrarSesion));
router.get('/session', autenticar, manejadorAsincrono(obtenerSesion));
router.get('/profile', autenticar, manejadorAsincrono(obtenerPerfil));
router.patch('/profile', autenticar, manejadorAsincrono(actualizarPerfil));
module.exports = router;
