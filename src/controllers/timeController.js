const { obtenerTiemposSupervisor, obtenerTiemposAgente } = require('../models/timeModel');
const { formatearFecha, formatearHora } = require('../utils/dates');

const transformarTiempo = fila => ({
    ...fila,
    date: formatearFecha(fila.startedAt),
    startTime: formatearHora(String(fila.startedAt).slice(11)),
    endTime: fila.endedAt ? formatearHora(String(fila.endedAt).slice(11)) : null,
    active: !fila.endedAt,
    totalTime: fila.totalTime || (fila.endedAt ? null : (() => { const segundos = Math.max(0, Math.floor((Date.now() - new Date(fila.startedAt).getTime()) / 1000)); return `${String(Math.floor(segundos / 3600)).padStart(2, '0')}:${String(Math.floor(segundos / 60) % 60).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`; })())
});

const listarTiemposSupervisor = async (req, res) => res.json({ data: (await obtenerTiemposSupervisor(req.query)).map(transformarTiempo) });
const listarTiemposAgente = async (req, res) => {
    if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tus propios tiempos' });
    res.json({ data: (await obtenerTiemposAgente(req.query)).map(transformarTiempo) });
};

module.exports = { listarTiemposSupervisor, listarTiemposAgente };
