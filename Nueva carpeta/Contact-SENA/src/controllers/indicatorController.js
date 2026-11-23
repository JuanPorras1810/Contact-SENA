const { obtenerIndicadores } = require('../models/indicatorModel');

const obtenerDatosIndicadores = async (req, res) => {
    const start = req.query.start || new Date().toISOString().slice(0, 10);
    const end = req.query.end || start;
    if (start > end) return res.status(400).json({ error: 'El rango de fechas no es válido' });
    const resultado = await obtenerIndicadores({ start, end });
    res.json({ data: resultado.rows, summary: resultado.summary });
};

module.exports = { obtenerDatosIndicadores };
