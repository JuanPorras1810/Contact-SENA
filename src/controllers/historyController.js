const { listInteractions, listCases } = require('../models/historyModel');

const getHistory = async (req, res) => res.json({ contacts: await listInteractions(), tickets: await listCases() });
const getAgentHistory = async (req, res) => {
    if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tu propio historial' });
    res.json({ contacts: await listInteractions(req.query.agentId), tickets: await listCases(req.query.agentId) });
};

module.exports = { getHistory, getAgentHistory };
