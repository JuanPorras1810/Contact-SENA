const { getSupervisorTimes, getAgentTimes } = require('../models/timeModel');
const { formatDate, formatTime } = require('../utils/dates');

const mapTime = row => ({
    ...row,
    date: formatDate(row.startedAt),
    startTime: formatTime(String(row.startedAt).slice(11)),
    endTime: row.endedAt ? formatTime(String(row.endedAt).slice(11)) : null,
    active: !row.endedAt
});

const listSupervisorTimes = async (req, res) => res.json({ data: (await getSupervisorTimes(req.query)).map(mapTime) });
const listAgentTimes = async (req, res) => {
    if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tus propios tiempos' });
    res.json({ data: (await getAgentTimes(req.query)).map(mapTime) });
};

module.exports = { listSupervisorTimes, listAgentTimes };
