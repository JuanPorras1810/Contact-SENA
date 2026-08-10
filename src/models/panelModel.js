const { pool } = require('../config/database');

const obtenerDatosPanel = async () => {
    const [connected] = await pool.query(`SELECT a.idAge AS id, a.nomAge AS name, r.fecHoraIniRegAge AS startedAt FROM registroAgente r INNER JOIN agente a ON a.idAge = r.idAgeRegAge WHERE r.fecHoraCieRegAge IS NULL ORDER BY r.fecHoraIniRegAge`);
    const [cases] = await pool.query(`SELECT c.codCas AS id, c.fecIniCas AS createdAt, c.comIntCas AS comment, a.nomAge AS agent FROM caso c INNER JOIN interaccion i ON i.codInt = c.codIntCas INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt INNER JOIN agente a ON a.idAge = ba.idAgeAse WHERE c.fecCieCas IS NULL AND e.nomEstCas IN ('Abierto', 'Escalado') ORDER BY c.codCas DESC`);
    const [activities] = await pool.query(`SELECT i.codInt AS id, a.nomAge AS agent, cl.conCli AS clientId, cl.nomCli AS clientName, i.motInt AS reason, i.obsInt AS observation FROM interaccion i INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt INNER JOIN agente a ON a.idAge = ba.idAgeAse INNER JOIN baseDatosCliente cl ON cl.conCli = i.conCliInt WHERE i.fecInt = CURDATE() ORDER BY i.codInt DESC`);
    const [[totals]] = await pool.query('SELECT COUNT(*) AS totalAgents FROM agente');
    return { connected, cases, activities, metrics: { totalAgents: Number(totals.totalAgents), connectedAgents: connected.length, openCases: cases.length, todayActivities: activities.length } };
};

module.exports = { obtenerDatosPanel };
