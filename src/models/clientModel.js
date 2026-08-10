const { pool } = require('../config/database');

const listarClientes = async () => {
    const [rows] = await pool.query(`
        SELECT c.conCli AS id, c.idCli AS documentId, c.nomCli AS name, c.emaCli AS email, c.codCamCli AS campaignId,
               c.telCli AS phone, c.telAltCli AS phoneAlt, c.dirCli AS address, ca.nomCam AS campaign
        FROM baseDatosCliente c
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        ORDER BY c.conCli DESC`);
    return rows;
};

const crearClienteModelo = async cliente => {
    const [result] = await pool.query(`INSERT INTO baseDatosCliente
        (idTipDoCli, idBarCli, codCamCli, idCli, nomCli, emaCli, dirCli, telCli, telAltCli, obsCli)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
         cliente.documentTypeId || null, cliente.neighborhoodId || null, cliente.campaignId, cliente.documentId || null,
        cliente.name || null, cliente.email || null, cliente.address || null, cliente.phone,
        cliente.phoneAlt || null, cliente.observation || null
    ]);
    return { id: result.insertId, ...cliente };
};
const crearClientesMasivosModelo = async clientes => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (const cliente of clientes) {
            await connection.query(`INSERT INTO baseDatosCliente
                (idTipDoCli, idBarCli, codCamCli, idCli, nomCli, emaCli, dirCli, telCli, telAltCli, obsCli)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                cliente.documentTypeId || null, cliente.neighborhoodId || null, cliente.campaignId, cliente.documentId || null,
                cliente.name || null, cliente.email || null, cliente.address || null, cliente.phone,
                cliente.phoneAlt || null, cliente.observation || null
            ]);
        }
        await connection.commit();
        return clientes.length;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};
const actualizarClienteModelo = async (id, cliente) => { await pool.query(`UPDATE baseDatosCliente SET idTipDoCli = ?, idBarCli = ?, codCamCli = ?, idCli = ?, nomCli = ?, emaCli = ?, dirCli = ?, telCli = ?, telAltCli = ?, obsCli = ? WHERE conCli = ?`, [cliente.documentTypeId || null, cliente.neighborhoodId || null, cliente.campaignId, cliente.documentId || null, cliente.name || null, cliente.email || null, cliente.address || null, cliente.phone, cliente.phoneAlt || null, cliente.observation || null, id]); return { id, ...cliente }; };

const listarClientesAsignados = async agentId => {
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

module.exports = { listarClientes, crearClienteModelo, crearClientesMasivosModelo, actualizarClienteModelo, listarClientesAsignados };
