const { listarInteracciones, listarCasos, listarTrazabilidadCaso } = require('../models/historyModel');

const obtenerHistorial = async (req, res) => res.json({ contacts: await listarInteracciones(req.query.agentId, req.query), cases: await listarCasos(req.query.agentId, req.query) });
const obtenerHistorialAgente = async (req, res) => {
    if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tu propio historial' });
    res.json({ contacts: await listarInteracciones(req.query.agentId, req.query), cases: await listarCasos(req.query.agentId, req.query) });
};
const obtenerTrazabilidad = async (req, res) => res.json({ data: await listarTrazabilidadCaso(req.params.id, req.auth.id, req.auth.role) });

module.exports = { obtenerHistorial, obtenerHistorialAgente, obtenerTrazabilidad };
