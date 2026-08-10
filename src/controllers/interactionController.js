const { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy } = require('../models/interactionModel');

const obtenerCatalogos = async (req, res) => res.json(await obtenerCatalogosModelo(req.query.campaignId));
const obtenerHoy = async (req, res) => res.json({ data: await listarInteraccionesHoy(req.auth.id) });
const crearInteraccion = async (req, res) => {
    const obligatorios = ['assignmentId', 'agentId', 'typificationId', 'channelId', 'statusId', 'reason', 'observation'];
    if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa todos los campos de la gestión' });
    if (String(req.body.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes registrar gestiones a tu nombre' });
    const now = new Date();
    const completar = valor => String(valor).padStart(2, '0');
    const fechaLocal = `${now.getFullYear()}-${completar(now.getMonth() + 1)}-${completar(now.getDate())}`;
    const horaActual = now.toTimeString().slice(0, 8);
    const crearCaso = Number(req.body.statusId) === 1 || Number(req.body.statusId) === 3;
    if (crearCaso && !String(req.body.caseComment || '').trim()) return res.status(400).json({ error: 'El comentario del caso es obligatorio para estados abiertos o escalados' });
    const data = await crearInteraccionModelo({ ...req.body, date: req.body.date || fechaLocal, startTime: req.body.startTime || horaActual, endTime: req.body.endTime || horaActual, duration: req.body.duration || '00:00:00', createCase: crearCaso });
    res.status(201).json({ data });
};

module.exports = { obtenerCatalogos, obtenerHoy, crearInteraccion };
