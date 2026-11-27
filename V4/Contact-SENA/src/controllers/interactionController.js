const { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy, listarCasosAgente, listarTrazabilidadCliente, crearSeguimientoModelo } = require('../models/interactionModel');

const obtenerCatalogos = async (req, res) => res.json(await obtenerCatalogosModelo(req.query.campaignId));
const obtenerHoy = async (req, res) => res.json({ data: await listarInteraccionesHoy(req.auth.id) });
const crearInteraccion = async (req, res) => {
    const obligatorios = ['assignmentId', 'agentId', 'typificationId', 'reason', 'observation'];
    if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa todos los campos de la gestión' });
    if (String(req.body.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes registrar gestiones a tu nombre' });
    const now = new Date();
    const completar = valor => String(valor).padStart(2, '0');
    const fechaLocal = `${now.getFullYear()}-${completar(now.getMonth() + 1)}-${completar(now.getDate())}`;
    const horaActual = now.toTimeString().slice(0, 8);
    const data = await crearInteraccionModelo({ ...req.body, date: req.body.date || fechaLocal, startTime: req.body.startTime || horaActual, endTime: req.body.endTime || horaActual, duration: req.body.duration || '00:00:00' });
    res.status(201).json({ data });
};

const obtenerCasosAgente = async (req, res) => res.json({ data: await listarCasosAgente(req.auth.id) });
const obtenerTrazabilidad = async (req, res) => res.json({ data: await listarTrazabilidadCliente(req.params.conCli, req.auth.id) });
const guardarSeguimiento = async (req, res) => {
    if (!req.body.typificationId || !req.body.observation || !req.body.date || !req.body.startTime || !req.body.endTime || !req.body.duration) return res.status(400).json({ error: 'Completa los datos de la llamada y la gestión' });
    res.status(201).json({ data: await crearSeguimientoModelo(req.params.id, req.auth.id, req.body) });
};

module.exports = { obtenerCatalogos, obtenerHoy, crearInteraccion, obtenerCasosAgente, obtenerTrazabilidad, guardarSeguimiento };
