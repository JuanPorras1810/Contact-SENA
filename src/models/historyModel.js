const { pool } = require('../config/database');

const listInteractions = async agentId => {
    const filter = agentId ? 'WHERE a.idAge = ?' : '';
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, i.fecInt AS date, i.motInt AS reason, i.obsInt AS observation,
               c.nomCli AS client, t.nomTip AS typification, e.nomEstCas AS status,
               a.nomAge AS agent
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        ${filter} ORDER BY i.fecInt DESC`, agentId ? [agentId] : []);
    return rows;
};

const listCases = async agentId => {
    const filter = agentId ? 'WHERE a.idAge = ?' : '';
    const [rows] = await pool.query(`
        SELECT c.codCas AS id, c.fecIniCas AS startDate, c.fecCieCas AS endDate,
               c.comIntCas AS comment, i.motInt AS reason, a.nomAge AS agent
        FROM caso c
        INNER JOIN interaccion i ON i.codInt = c.codIntCas
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        ${filter} ORDER BY c.fecIniCas DESC`, agentId ? [agentId] : []);
    return rows;
};

module.exports = { listInteractions, listCases };
