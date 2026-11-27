const { pool } = require('../config/database');

const construirFiltros = (agentId, filtros, alias = 'i', dateColumn = 'fecInt') => {
    const conditions = []; const params = [];
    if (agentId) { conditions.push('a.idAge = ?'); params.push(agentId); }
    if (filtros.start) { conditions.push(`${alias}.${dateColumn} >= ?`); params.push(filtros.start); }
    if (filtros.end) { conditions.push(`${alias}.${dateColumn} <= ?`); params.push(filtros.end); }
    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};
const listarInteracciones = async (agentId, filtros = {}) => {
    const { where, params } = construirFiltros(agentId, filtros);
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, i.fecInt AS date, i.motInt AS reason, ca.nomCam AS campaign, i.obsInt AS observation,
               i.tieProInt AS duration,
               c.conCli AS clientId, c.nomCli AS clientName, c.codCamCli AS campaignId, t.nomTip AS typification, e.nomEstCas AS status,
               a.idAge AS agentId, a.nomAge AS agent
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        ${where} ORDER BY i.codInt DESC`, params);
    return rows;
};

const listarCasos = async (agentId, filtros = {}) => {
    const { where, params } = construirFiltros(agentId, filtros, 'c', 'fecIniCas');
    const [rows] = await pool.query(`
        SELECT c.codCas AS id, c.fecIniCas AS startDate, c.fecCieCas AS endDate,
               c.cerCas AS caseClosed, latest.obsInt AS ultimaObservacion, latestTip.nomTip AS typification,
               cam.nomCam AS campaign, a.idAge AS agentId, a.nomAge AS agent,
               cli.conCli AS clientId, cli.nomCli AS clientName, cli.codCamCli AS campaignId
        FROM caso c
        INNER JOIN interaccion i ON i.codInt = c.codIntCas
        INNER JOIN baseDatosCliente cli ON cli.conCli = i.conCliInt
        INNER JOIN campana cam ON cam.codCam = cli.codCamCli
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        LEFT JOIN interaccion latest ON latest.codInt = (
            SELECT MAX(lastInt.codInt)
            FROM interaccion lastInt
            WHERE lastInt.conCliInt = i.conCliInt
        )
        LEFT JOIN tipificacion latestTip ON latestTip.codTip = latest.codTipInt
        ${where} ORDER BY c.codCas DESC`, params);
    return rows;
};

const listarTrazabilidadCaso = async (caseId, agentId, role) => {
    const condiciones = ['cs.codCas = ?'];
    const params = [caseId];
    if (role === 'agente') {
        condiciones.push('baOrigen.idAgeAse = ?');
        params.push(agentId);
    }
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, i.fecInt AS date, i.horIniInt AS startTime, i.horFinInt AS endTime,
               i.tieProInt AS duration, i.obsInt AS observation, t.nomTip AS typification, e.nomEstCas AS status,
               a.nomAge AS agent
        FROM caso cs
        INNER JOIN interaccion origen ON origen.codInt = cs.codIntCas
        INNER JOIN baseDatosAsesor baOrigen ON baOrigen.conAse = origen.conAseInt
        INNER JOIN interaccion i ON i.conCliInt = origen.conCliInt AND i.codInt >= origen.codInt
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN agente a ON a.idAge = ba.idAgeAse
        WHERE ${condiciones.join(' AND ')}
        ORDER BY i.fecInt ASC, i.horIniInt ASC, i.codInt ASC`, params);
    return rows;
};

module.exports = { listarInteracciones, listarCasos, listarTrazabilidadCaso };
