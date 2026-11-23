const { pool } = require('../config/database');

const construirFiltros = (agentId, filtros, alias = 'i') => {
    const conditions = []; const params = [];
    if (agentId) { conditions.push('a.idAge = ?'); params.push(agentId); }
    if (filtros.start) { conditions.push(`${alias}.fecInt >= ?`); params.push(filtros.start); }
    if (filtros.end) { conditions.push(`${alias}.fecInt <= ?`); params.push(filtros.end); }
    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};
const listarInteracciones = async (agentId, filtros = {}) => {
    const { where, params } = construirFiltros(agentId, filtros);
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, i.fecInt AS date, i.motInt AS reason, ca.nomCam AS campaign, i.obsInt AS observation,
               c.conCli AS clientId, c.nomCli AS clientName, t.nomTip AS typification, e.nomEstCas AS status,
               a.idAge AS agentId, a.nomAge AS agent
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        ${where} ORDER BY i.codInt DESC`, params);
    return rows;
};

const listarCasos = async (agentId, filtros = {}) => {
    const { where, params } = construirFiltros(agentId, filtros);
    const [rows] = await pool.query(`
        SELECT c.codCas AS id, c.fecIniCas AS startDate, c.fecCieCas AS endDate,
               c.comIntCas AS comment, i.motInt AS reason, a.idAge AS agentId, a.nomAge AS agent
        FROM caso c
        INNER JOIN interaccion i ON i.codInt = c.codIntCas
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        ${where} ORDER BY c.codCas DESC`, params);
    return rows;
};

module.exports = { listarInteracciones, listarCasos };
