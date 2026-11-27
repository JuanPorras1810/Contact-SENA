const { pool } = require('../config/database');

const obtenerIndicadores = async ({ start, end }) => {
    const conditions = [];
    const params = [];
    if (start) { conditions.push('i.fecInt >= ?'); params.push(start); }
    if (end) { conditions.push('i.fecInt <= ?'); params.push(end); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`
        SELECT i.fecInt AS date, a.idAge AS agentId, a.nomAge AS agent,
               COUNT(i.codInt) AS calls,
               SUM(e.nomEstCas IN ('Efectivo', 'En proceso')) AS contacts,
                SUM(e.nomEstCas = 'Efectivo') AS effective,
                SUM(e.nomEstCas = 'En proceso') AS inProgress,
                SUM(e.nomEstCas = 'Sin gestión') AS unmanaged,
                COALESCE(SUM(TIME_TO_SEC(i.tieProInt)), 0) AS conversationSeconds,
                COALESCE(ROUND(
                    SUM(TIME_TO_SEC(i.tieProInt)) / NULLIF(COUNT(i.codInt), 0),
                    0
                ), 0) AS tmoSeconds,
                COALESCE((SELECT SUM(GREATEST(0, TIMESTAMPDIFF(
                        SECOND,
                        r.fecHoraIniRegAge,
                        COALESCE(r.fecHoraCieRegAge, NOW())
                    )))
                     FROM registroAgente r
                     WHERE r.idAgeRegAge = a.idAge AND DATE(r.fecHoraIniRegAge) = i.fecInt), 0) AS adherenceSeconds,
                (SELECT COUNT(*) FROM caso cs JOIN interaccion ci ON ci.codInt = cs.codIntCas
                    JOIN baseDatosAsesor cba ON cba.conAse = ci.conAseInt
                    WHERE cba.idAgeAse = a.idAge AND cs.cerCas = TRUE AND cs.fecCieCas = i.fecInt) AS closedCases,
                (SELECT COUNT(*) FROM caso cs JOIN interaccion ci ON ci.codInt = cs.codIntCas
                    JOIN baseDatosAsesor cba ON cba.conAse = ci.conAseInt
                    WHERE cba.idAgeAse = a.idAge AND cs.cerCas = FALSE AND DATE(cs.fecIniCas) = i.fecInt) AS followupCases
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN tipificacion stateTip ON stateTip.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = stateTip.idEstCasTip
        ${where}
        GROUP BY i.fecInt, a.idAge, a.nomAge
        ORDER BY i.fecInt DESC, a.nomAge`, params);

    const [typifications] = await pool.query(`
        SELECT i.fecInt AS date, a.idAge AS agentId, t.nomTip AS name,
               SUM(e.nomEstCas = 'Efectivo') AS effective,
               SUM(e.nomEstCas = 'En proceso') AS inProgress,
               SUM(e.nomEstCas = 'Sin gestión') AS unmanaged
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        ${where}
        GROUP BY i.fecInt, a.idAge, t.codTip, t.nomTip
        ORDER BY t.nomTip`, params);

    rows.forEach(row => {
        row.calls = Number(row.calls || 0);
        row.contacts = Number(row.contacts || 0);
        row.effective = Number(row.effective || 0);
        row.inProgress = Number(row.inProgress || 0);
        row.unmanaged = Number(row.unmanaged || 0);
        row.conversationSeconds = Number(row.conversationSeconds || 0);
        row.tmoSeconds = Number(row.tmoSeconds || 0);
        row.adherenceSeconds = Number(row.adherenceSeconds || 0);
        row.closedCases = Number(row.closedCases || 0);
        row.followupCases = Number(row.followupCases || 0);
        row.typifications = typifications.filter(item => String(item.agentId) === String(row.agentId) && String(item.date).slice(0, 10) === String(row.date).slice(0, 10));
    });

    const summary = rows.reduce((total, row) => ({
        calls: total.calls + row.calls,
        contacts: total.contacts + row.contacts,
        effective: total.effective + row.effective
    }), { calls: 0, contacts: 0, effective: 0 });
    return { rows, summary };
};

module.exports = { obtenerIndicadores };
