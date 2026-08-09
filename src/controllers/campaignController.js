const { listCampaigns, listTypifications, createCampaign } = require('../models/campaignModel');

const getCampaigns = async (req, res) => res.json({ data: await listCampaigns() });
const getTypifications = async (req, res) => res.json({ data: await listTypifications(req.params.id) });
const postCampaign = async (req, res) => {
    if (!req.body.name || !req.body.startDate || !req.body.endDate) return res.status(400).json({ error: 'Nombre, fecha inicial y fecha final son obligatorios' });
    if (!req.file) return res.status(400).json({ error: 'El archivo PDF de la campaña es obligatorio' });
    const fileUrl = req.file ? `/uploads/campaigns/${req.file.filename}` : null;
    res.status(201).json({ data: await createCampaign({ ...req.body, fileUrl }) });
};

module.exports = { getCampaigns, getTypifications, postCampaign };
