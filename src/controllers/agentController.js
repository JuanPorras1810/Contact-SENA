const { createAgent } = require('../models/agentModel');

const postAgent = async (req, res) => {
    const required = ['id', 'documentTypeId', 'neighborhoodId', 'name', 'email', 'address', 'phone', 'password'];
    if (required.some(field => !req.body[field])) return res.status(400).json({ error: 'Completa todos los campos obligatorios del agente' });
    res.status(201).json({ data: await createAgent(req.body) });
};

module.exports = { postAgent };
