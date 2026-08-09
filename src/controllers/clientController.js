const { listClients, createClient, listAssignedClients } = require('../models/clientModel');

const getClients = async (req, res) => res.json({ data: await listClients() });
const getAssignedClients = async (req, res) => { if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tus clientes asignados' }); res.json({ data: await listAssignedClients(req.query.agentId) }); };
const postClient = async (req, res) => {
    const required = ['documentTypeId', 'campaignId', 'documentId', 'phone'];
    if (required.some(field => !req.body[field])) return res.status(400).json({ error: 'Tipo de documento, campaña, documento y teléfono son obligatorios' });
    res.status(201).json({ data: await createClient(req.body) });
};

module.exports = { getClients, getAssignedClients, postClient };
