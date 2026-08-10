const { crearAsignacionModelo, actualizarAsignacionModelo, reequilibrarClientesPendientes } = require('../models/assignmentModel');

const crearAsignacion = async (req, res) => {
    if (!req.body.agentId || !req.body.campaignId) return res.status(400).json({ error: 'Agente y campaña son obligatorios' });
    const data = await crearAsignacionModelo(req.body); await reequilibrarClientesPendientes(); res.status(201).json({ data });
};
const actualizarAsignacion = async (req, res) => {
    if (!req.body.agentId || !req.body.campaignId) return res.status(400).json({ error: 'Agente y campaña son obligatorios' });
    const datos = await actualizarAsignacionModelo(req.params.id, req.body); await reequilibrarClientesPendientes(); res.json({ data: datos });
};

module.exports = { crearAsignacion, actualizarAsignacion };
