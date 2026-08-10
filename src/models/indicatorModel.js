const { pool } = require('../config/database');

const obtenerIndicadores = async ({ start, end }) => {
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
                SUM(e.nomEstCas = 'Escalado') AS unmanaged,
                COALESCE(AVG(TIME_TO_SEC(i.tieProInt)), 0) AS averageSeconds,
               (SELECT COALESCE(SUM(TIME_TO_SEC(COALESCE(r.tieTotRegAge, TIMEDIFF(COALESCE(r.fecHoraCieRegAge, NOW()), r.fecHoraIniRegAge)))), 0)
                FROM registroAgente r WHERE r.idAgeRegAge = a.idAge AND DATE(r.fecHoraIniRegAge) = i.fecInt) AS connectionSeconds
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        ${where}
        GROUP BY i.fecInt, a.idAge, a.nomAge ORDER BY i.fecInt DESC`, params);
    const [summaryRows] = await pool.query(`SELECT COUNT(i.codInt) AS interactions,
        COALESCE(SUM(e.nomEstCas = 'Cerrado'), 0) AS resolved,
        COALESCE(SUM(e.nomEstCas = 'Abierto'), 0) AS open,
        COALESCE(SUM(e.nomEstCas = 'Escalado'), 0) AS escalated,
        COALESCE(SUM(e.nomEstCas IN ('Abierto', 'Escalado')), 0) AS tickets
        FROM interaccion i INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt ${where}`, params);
    return { rows, summary: summaryRows[0] };
};

module.exports = { obtenerIndicadores };
