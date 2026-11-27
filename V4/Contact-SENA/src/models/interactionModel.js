const { pool } = require('../config/database');

const obtenerCatalogosModelo = async campaignId => {
    const [statuses] = await pool.query('SELECT idEstCas AS id, nomEstCas AS name FROM estadoCaso ORDER BY idEstCas');
    const [typifications] = await pool.query(`
        SELECT t.codTip AS id, t.nomTip AS name, t.idEstCasTip AS statusId, e.nomEstCas AS status
        FROM campanaTipificacion ct
        INNER JOIN tipificacion t ON t.codTip = ct.codTip
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        WHERE ct.codCam = ? ORDER BY t.codTip`, [campaignId]);
    return { statuses, typifications, channel: { id: 1, name: 'Llamada' } };
};

const obtenerTipificacionEstado = async (connection, campaignId, typificationId) => {
    const [[row]] = await connection.query(`
        SELECT t.idEstCasTip AS statusId, e.nomEstCas AS status
        FROM campanaTipificacion ct
        INNER JOIN tipificacion t ON t.codTip = ct.codTip
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        WHERE ct.codCam = ? AND t.codTip = ?`, [campaignId, typificationId]);
    if (!row) throw Object.assign(new Error('La tipificación no pertenece a la campaña'), { status: 400 });
    return row;
};

const fechaSeguimiento = (statusId, followupAt) => {
    if (Number(statusId) === 3) return followupAt || new Date(Date.now() + 60 * 60 * 1000);
    return followupAt || null;
};

const crearInteraccionModelo = async interaccion => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [valid] = await connection.query(`SELECT al.conCliAsi AS clientId, c.codCamCli AS campaignId, ba.conAse AS advisorId
            FROM asignacionLlamada al
            INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
            INNER JOIN baseDatosCliente c ON c.conCli = al.conCliAsi
            WHERE al.codAsi = ? AND ba.idAgeAse = ? AND (al.conAteAsi = 0 OR al.conAteAsi IS NULL)
            LIMIT 1 FOR UPDATE`, [interaccion.assignmentId, interaccion.agentId]);
        if (!valid.length) throw Object.assign(new Error('La asignación está cerrada o no pertenece al agente'), { status: 400 });
        const status = await obtenerTipificacionEstado(connection, valid[0].campaignId, interaccion.typificationId);
        const followupAt = fechaSeguimiento(status.statusId, interaccion.followupAt);
        if (Number(status.statusId) === 2 && !followupAt) throw Object.assign(new Error('Programa la fecha y hora de rellamada para el caso en proceso'), { status: 400 });
        const [result] = await connection.query(`INSERT INTO interaccion
            (conAseInt, conCliInt, codTipInt, idCanInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`, [
            valid[0].advisorId, valid[0].clientId, interaccion.typificationId, interaccion.reason,
            interaccion.date, interaccion.startTime, interaccion.endTime, interaccion.duration, interaccion.observation
        ]);
        await connection.query('UPDATE asignacionLlamada SET conAteAsi = 1 WHERE codAsi = ?', [interaccion.assignmentId]);
        const createCase = Number(status.statusId) === 2 || Number(status.statusId) === 3;
        if (createCase) await connection.query(
            'INSERT INTO caso (codIntCas, fecIniCas, fecCieCas, fecSegCas, cerCas) VALUES (?, CURDATE(), NULL, ?, FALSE)',
            [result.insertId, followupAt]
        );
        await connection.commit();
        return { id: result.insertId, caseCreated: createCase, status: status.status };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
};

const listarCasosAgente = async agentId => {
    const [rows] = await pool.query(`SELECT cs.codCas AS id, latest.obsInt AS observation, cs.fecSegCas AS followupAt,
        cs.cerCas AS closed, c.conCli AS clientId, c.idCli AS clientExternalId, c.nomCli AS clientName, c.telCli AS phone,
        c.telAltCli AS phoneAlt, c.emaCli AS email, c.dirCli AS address, b.nomBar AS neighborhood,
        m.nomMun AS municipality, d.nomDep AS department, c.obsCli AS clientObservation,
        c.codCamCli AS campaignId, ca.nomCam AS campaign, ca.proCam AS campaignPdf
        FROM caso cs JOIN interaccion i ON i.codInt = cs.codIntCas
        JOIN interaccion latest ON latest.codInt = (
            SELECT lastInt.codInt FROM interaccion lastInt
            WHERE lastInt.conCliInt = i.conCliInt ORDER BY lastInt.codInt DESC LIMIT 1
        )
        JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        JOIN campana ca ON ca.codCam = c.codCamCli
        LEFT JOIN barrio b ON c.idBarCli = b.idBar
        LEFT JOIN municipio m ON b.idMunBar = m.idMun
        LEFT JOIN departamento d ON m.idDepMun = d.idDep
        WHERE ba.idAgeAse = ? AND cs.cerCas = FALSE ORDER BY cs.fecSegCas ASC, cs.codCas ASC`, [agentId]);
    return rows;
};

const listarTrazabilidadCliente = async (clientId, agentId) => {
    const [rows] = await pool.query(`SELECT i.codInt AS id, i.fecInt AS date, i.horIniInt AS startTime,
        i.horFinInt AS endTime, i.tieProInt AS duration, t.nomTip AS typification, e.nomEstCas AS status,
        i.obsInt AS observation, a.nomAge AS agent
        FROM interaccion i
        JOIN tipificacion t ON t.codTip = i.codTipInt
        JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        JOIN agente a ON a.idAge = ba.idAgeAse
        WHERE i.conCliInt = ? AND ba.idAgeAse = ? ORDER BY i.fecInt ASC, i.horIniInt ASC, i.codInt ASC`, [clientId, agentId]);
    return rows;
};

const crearSeguimientoModelo = async (caseId, agentId, interaction) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [cases] = await connection.query(`SELECT cs.codCas, i.conCliInt AS clientId, ba.conAse AS advisorId, c.codCamCli AS campaignId
            FROM caso cs
            JOIN interaccion i ON i.codInt = cs.codIntCas
            JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
            JOIN baseDatosCliente c ON c.conCli = i.conCliInt
            WHERE cs.codCas = ? AND cs.cerCas = FALSE AND ba.idAgeAse = ? FOR UPDATE`, [caseId, agentId]);
        if (!cases.length) throw Object.assign(new Error('El caso no está abierto o no pertenece al agente'), { status: 404 });
        const status = await obtenerTipificacionEstado(connection, cases[0].campaignId, interaction.typificationId);
        const followupAt = fechaSeguimiento(status.statusId, interaction.followupAt);
        if (Number(status.statusId) === 2 && !followupAt) throw Object.assign(new Error('Programa la fecha y hora de rellamada'), { status: 400 });
        const [result] = await connection.query(`INSERT INTO interaccion
            (conAseInt, conCliInt, codTipInt, idCanInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`, [
            cases[0].advisorId, cases[0].clientId, interaction.typificationId, interaction.reason || '',
            interaction.date, interaction.startTime, interaction.endTime, interaction.duration, interaction.observation
        ]);
        if (Number(status.statusId) === 1) {
            await connection.query('UPDATE caso SET cerCas = TRUE, fecCieCas = CURDATE(), fecSegCas = NULL WHERE codCas = ?', [caseId]);
        } else {
            await connection.query('UPDATE caso SET fecSegCas = ?, cerCas = FALSE WHERE codCas = ?', [followupAt, caseId]);
        }
        await connection.commit();
        return { id: result.insertId, caseId: Number(caseId), caseClosed: Number(status.statusId) === 1, status: status.status };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

const listarInteraccionesHoy = async agentId => {
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, c.conCli AS clientId, c.nomCli AS clientName, c.codCamCli AS campaignId,
               ca.nomCam AS campaign, 'Llamada' AS channel, t.nomTip AS typification, i.obsInt AS observation,
               i.tieProInt AS duration, e.nomEstCas AS status
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        WHERE ba.idAgeAse = ? AND i.fecInt = CURDATE()
        ORDER BY i.codInt DESC`, [agentId]);
    return rows;
};

module.exports = { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy, listarCasosAgente, listarTrazabilidadCliente, crearSeguimientoModelo };
