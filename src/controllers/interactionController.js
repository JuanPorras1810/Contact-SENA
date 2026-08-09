const { getCatalogs, createInteraction, listTodayInteractions } = require('../models/interactionModel');

const catalogs = async (req, res) => res.json(await getCatalogs(req.query.campaignId));
const today = async (req, res) => res.json({ data: await listTodayInteractions(req.auth.id) });
const postInteraction = async (req, res) => {
    const required = ['assignmentId', 'agentId', 'typificationId', 'channelId', 'statusId', 'reason', 'observation'];
    if (required.some(field => !req.body[field])) return res.status(400).json({ error: 'Completa todos los campos de la gestión' });
    if (String(req.body.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes registrar gestiones a tu nombre' });
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentTime = now.toTimeString().slice(0, 8);
    const createCase = Number(req.body.statusId) === 2 || Number(req.body.statusId) === 3;
    const data = await createInteraction({ ...req.body, date: req.body.date || localDate, startTime: req.body.startTime || currentTime, endTime: req.body.endTime || currentTime, duration: req.body.duration || '00:00:00', createCase });
    res.status(201).json({ data });
};

module.exports = { catalogs, today, postInteraction };
