const { pool } = require('../config/database');

const getIndicators = async ({ start, end }) => {
    const conditions = [];
    const params = [];
    if (start) { conditions.push('i.fecInt >= ?'); params.push(start); }
    if (end) { conditions.push('i.fecInt <= ?'); params.push(end); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`
        SELECT i.fecInt AS date, a.idAge AS agentId, a.nomAge AS agent,
               COUNT(i.codInt) AS interactions,
               SUM(e.nomEstCas = 'Cerrado') AS resolved,
               SUM(e.nomEstCas = 'Abierto') AS inProgress,
               SUM(e.nomEstCas = 'Escalado') AS unmanaged
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        ${where}
        GROUP BY i.fecInt, a.idAge, a.nomAge ORDER BY i.fecInt DESC`, params);
    return rows;
};

module.exports = { getIndicators };
