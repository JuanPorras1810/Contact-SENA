const { createAssignment } = require('../models/assignmentModel');

const postAssignment = async (req, res) => {
    if (!req.body.agentId || !req.body.campaignId) return res.status(400).json({ error: 'Agente y campaña son obligatorios' });
    res.status(201).json({ data: await createAssignment(req.body) });
};

module.exports = { postAssignment };
