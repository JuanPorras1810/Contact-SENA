const { pool } = require('../config/database');

const getPanelData = async () => {
    const [connected] = await pool.query(`SELECT a.idAge AS id, a.nomAge AS name, r.fecHoraIniRegAge AS startedAt FROM registroAgente r INNER JOIN agente a ON a.idAge = r.idAgeRegAge WHERE r.fecHoraCieRegAge IS NULL ORDER BY r.fecHoraIniRegAge`);
    const [cases] = await pool.query(`SELECT c.codCas AS id, c.fecIniCas AS createdAt, c.comIntCas AS comment, a.nomAge AS agent FROM caso c INNER JOIN interaccion i ON i.codInt = c.codIntCas INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt INNER JOIN agente a ON a.idAge = ba.idAgeAse ORDER BY c.fecIniCas DESC`);
    const [activities] = await pool.query(`SELECT i.codInt AS id, a.nomAge AS agent, cl.nomCli AS client, i.motInt AS reason, i.obsInt AS observation FROM interaccion i INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt INNER JOIN agente a ON a.idAge = ba.idAgeAse INNER JOIN baseDatosCliente cl ON cl.conCli = i.conCliInt ORDER BY i.fecInt DESC`);
    return { connected, cases, activities };
};

module.exports = { getPanelData };
