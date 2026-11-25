const { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy, listarCasosAgente, listarTrazabilidadCliente, crearSeguimientoModelo } = require('../models/interactionModel');

const obtenerCatalogos = async (req, res) => res.json(await obtenerCatalogosModelo(req.query.campaignId));
const obtenerHoy = async (req, res) => res.json({ data: await listarInteraccionesHoy(req.auth.id) });
const crearInteraccion = async (req, res) => {
    const obligatorios = ['assignmentId', 'agentId', 'typificationId', 'statusId', 'reason', 'observation'];
    if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa todos los campos de la gestión' });
    if (String(req.body.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes registrar gestiones a tu nombre' });
    const now = new Date();
    const completar = valor => String(valor).padStart(2, '0');
    const fechaLocal = `${now.getFullYear()}-${completar(now.getMonth() + 1)}-${completar(now.getDate())}`;
    const horaActual = now.toTimeString().slice(0, 8);
    const statusId = Number(req.body.statusId);
    if (![1, 2, 3].includes(statusId)) return res.status(400).json({ error: 'Selecciona un resultado válido para la gestión' });
    const crearCaso = statusId === 2 || statusId === 3;
    if (crearCaso && !String(req.body.observation || '').trim()) return res.status(400).json({ error: 'La observación es obligatoria para estados en proceso o sin gestión' });
    const followupAt = statusId === 3
        ? new Date(Date.now() + 60 * 60 * 1000).toLocaleString('sv-SE').replace('T', ' ')
        : req.body.followupAt;
    if (statusId === 2 && !followupAt) return res.status(400).json({ error: 'Programa la fecha y hora de rellamada para el caso en proceso' });
    const data = await crearInteraccionModelo({ ...req.body, followupAt, date: req.body.date || fechaLocal, startTime: req.body.startTime || horaActual, endTime: req.body.endTime || horaActual, duration: req.body.duration || '00:00:00', createCase: crearCaso });
    res.status(201).json({ data });
};

const obtenerCasosAgente = async (req, res) => res.json({ data: await listarCasosAgente(req.auth.id) });
const obtenerTrazabilidad = async (req, res) => res.json({ data: await listarTrazabilidadCliente(req.params.conCli, req.auth.id) });
const guardarSeguimiento = async (req, res) => {
    const statusId = Number(req.body.statusId);
    if (!req.body.typificationId || ![1, 2, 3].includes(statusId) || !req.body.observation || !req.body.date || !req.body.startTime || !req.body.endTime || !req.body.duration) return res.status(400).json({ error: 'Completa los datos de la llamada y la gestión' });
    let followupAt = req.body.followupAt;
    if (statusId === 3) {
        const nextContact = new Date(Date.now() + 60 * 60 * 1000);
        const pad = value => String(value).padStart(2, '0');
        followupAt = `${nextContact.getFullYear()}-${pad(nextContact.getMonth() + 1)}-${pad(nextContact.getDate())} ${pad(nextContact.getHours())}:${pad(nextContact.getMinutes())}:00`;
    } else if (statusId === 2 && !followupAt) {
        return res.status(400).json({ error: 'Programa la fecha y hora de rellamada' });
    }
    res.status(201).json({ data: await crearSeguimientoModelo(req.params.id, req.auth.id, { ...req.body, followupAt }) });
};

module.exports = { obtenerCatalogos, obtenerHoy, crearInteraccion, obtenerCasosAgente, obtenerTrazabilidad, guardarSeguimiento };
