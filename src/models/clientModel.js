const { pool } = require('../config/database');

const listClients = async () => {
    const [rows] = await pool.query(`
        SELECT c.conCli AS id, c.idCli AS documentId, c.nomCli AS name, c.emaCli AS email,
               c.telCli AS phone, c.telAltCli AS phoneAlt, c.dirCli AS address, ca.nomCam AS campaign
        FROM baseDatosCliente c
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        ORDER BY c.conCli DESC`);
    return rows;
};

const createClient = async client => {
    const [result] = await pool.query(`INSERT INTO baseDatosCliente
        (idTipDoCli, idBarCli, codCamCli, idCli, nomCli, emaCli, dirCli, telCli, telAltCli, obsCli)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        client.documentTypeId, client.neighborhoodId || null, client.campaignId, client.documentId,
        client.name || null, client.email || null, client.address || null, client.phone,
        client.phoneAlt || null, client.observation || null
    ]);
    return { id: result.insertId, ...client };
};

const listAssignedClients = async agentId => {
    const [rows] = await pool.query(`SELECT al.codAsi AS assignmentId, c.conCli AS id, c.idCli AS documentId, c.nomCli AS name,
        c.telCli AS phone, c.telAltCli AS phoneAlt, c.emaCli AS email, c.dirCli AS address, c.obsCli AS observation, ca.nomCam AS campaign,
        c.codCamCli AS campaignId, ca.proCam AS campaignPdf, al.conAteAsi AS attended
        FROM asignacionLlamada al
        INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
        INNER JOIN baseDatosCliente c ON c.conCli = al.conCliAsi
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        WHERE ba.idAgeAse = ? AND (al.conAteAsi = 0 OR al.conAteAsi IS NULL)
        ORDER BY al.fecAsi ASC, al.codAsi ASC`, [agentId]);
    return rows;
};

module.exports = { listClients, createClient, listAssignedClients };
