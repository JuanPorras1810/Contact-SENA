const { pool } = require('../config/database');

const obtenerDatosPanel = async () => {
    const [connected] = await pool.query(`SELECT a.idAge AS id, a.nomAge AS name, r.fecHoraIniRegAge AS startedAt FROM registroAgente r INNER JOIN agente a ON a.idAge = r.idAgeRegAge WHERE r.fecHoraCieRegAge IS NULL ORDER BY r.fecHoraIniRegAge`);
    const [cases] = await pool.query(`SELECT c.codCas AS id, c.fecIniCas AS createdAt, i.codInt AS interactionId,
        a.nomAge AS agent, cl.conCli AS clientId, cl.nomCli AS clientName, t.nomTip AS typification
        FROM caso c
        INNER JOIN interaccion i ON i.codInt = c.codIntCas
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN baseDatosCliente cl ON cl.conCli = i.conCliInt
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        WHERE c.cerCas = FALSE AND e.nomEstCas IN ('En proceso', 'Sin gestión')
        ORDER BY c.fecSegCas ASC, c.codCas DESC`);
    const [activities] = await pool.query(`SELECT i.codInt AS id, a.nomAge AS agent, cl.conCli AS clientId, cl.nomCli AS clientName, ca.nomCam AS campaign, t.nomTip AS typification FROM interaccion i INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt INNER JOIN agente a ON a.idAge = ba.idAgeAse INNER JOIN baseDatosCliente cl ON cl.conCli = i.conCliInt INNER JOIN campana ca ON ca.codCam = cl.codCamCli INNER JOIN tipificacion t ON t.codTip = i.codTipInt WHERE i.fecInt = CURDATE() ORDER BY i.codInt DESC`);
    const [[totals]] = await pool.query('SELECT COUNT(*) AS totalAgents FROM agente');
    return { connected, cases, activities, metrics: { totalAgents: Number(totals.totalAgents), connectedAgents: connected.length, openCases: cases.length, todayActivities: activities.length } };
};

const obtenerTrazabilidadCaso = async caseId => {
    const [rows] = await pool.query(`SELECT i.codInt AS id, i.fecInt AS date, i.horIniInt AS startTime,
        i.horFinInt AS endTime, i.tieProInt AS duration, i.obsInt AS observation, t.nomTip AS typification,
        e.nomEstCas AS status, a.nomAge AS agent
        FROM caso cs
        INNER JOIN interaccion origen ON origen.codInt = cs.codIntCas
        INNER JOIN interaccion i ON i.conCliInt = origen.conCliInt AND i.codInt >= origen.codInt
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        WHERE cs.codCas = ?
        ORDER BY i.fecInt ASC, i.horIniInt ASC, i.codInt ASC`, [caseId]);
    return rows;
};

module.exports = { obtenerDatosPanel, obtenerTrazabilidadCaso };
