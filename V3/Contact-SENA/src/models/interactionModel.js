const { pool } = require('../config/database');

const obtenerCatalogosModelo = async campaignId => {
    const [statuses] = await pool.query('SELECT idEstCas AS id, nomEstCas AS name FROM estadoCaso ORDER BY idEstCas');
    const [typifications] = await pool.query('SELECT codTip AS id, nomTip AS name FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaignId]);
    return { statuses, typifications, channel: { id: 1, name: 'Llamada' } };
};

const crearInteraccionModelo = async interaccion => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [valid] = await connection.query(`SELECT al.conCliAsi AS clientId, c.codCamCli AS campaignId
            FROM asignacionLlamada al INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
            INNER JOIN baseDatosCliente c ON c.conCli = al.conCliAsi
            INNER JOIN tipificacion t ON t.codCamTip = c.codCamCli
            WHERE al.codAsi = ? AND ba.idAgeAse = ? AND t.codTip = ? AND (al.conAteAsi = 0 OR al.conAteAsi IS NULL)
            LIMIT 1 FOR UPDATE`, [interaccion.assignmentId, interaccion.agentId, interaccion.typificationId]);
        if (!valid.length) throw Object.assign(new Error('La asignación está cerrada o la tipificación no pertenece a la campaña'), { status: 400 });
        const [result] = await connection.query(`INSERT INTO interaccion
            (conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
            SELECT ba.conAse, al.conCliAsi, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM asignacionLlamada al
            INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
            WHERE al.codAsi = ? AND ba.idAgeAse = ? LIMIT 1`, [
            interaccion.typificationId, 1, interaccion.statusId, interaccion.reason,
            interaccion.date, interaccion.startTime, interaccion.endTime, interaccion.duration, interaccion.observation,
            interaccion.assignmentId, interaccion.agentId
        ]);
        if (!result.affectedRows) throw Object.assign(new Error('La asignación no pertenece al agente autenticado'), { status: 400 });
        await connection.query('UPDATE asignacionLlamada SET conAteAsi = 1 WHERE codAsi = ?', [interaccion.assignmentId]);
        if (interaccion.createCase) {
            await connection.query('INSERT INTO caso (codIntCas, fecIniCas, fecCieCas, fecSegCas, cerCas) VALUES (?, CURDATE(), NULL, ?, FALSE)', [result.insertId, interaccion.followupAt || null]);
        }
        await connection.commit();
        return { id: result.insertId, caseCreated: Boolean(interaccion.createCase) };
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
            WHERE lastInt.conCliInt = i.conCliInt
            ORDER BY lastInt.codInt DESC LIMIT 1
        )
        JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        JOIN baseDatosCliente c ON c.conCli = i.conCliInt JOIN campana ca ON ca.codCam = c.codCamCli
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
        FROM interaccion i JOIN tipificacion t ON t.codTip = i.codTipInt
        JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        JOIN agente a ON a.idAge = ba.idAgeAse
        WHERE i.conCliInt = ? AND ba.idAgeAse = ? ORDER BY i.fecInt ASC, i.horIniInt ASC, i.codInt ASC`, [clientId, agentId]);
    return rows;
};

const crearSeguimientoModelo = async (caseId, agentId, interaction) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [cases] = await connection.query(`SELECT cs.codCas, i.conCliInt AS clientId, ba.conAse AS advisorId
            FROM caso cs JOIN interaccion i ON i.codInt = cs.codIntCas
            JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
            WHERE cs.codCas = ? AND cs.cerCas = FALSE AND ba.idAgeAse = ? FOR UPDATE`, [caseId, agentId]);
        if (!cases.length) throw Object.assign(new Error('El caso no está abierto o no pertenece al agente'), { status: 404 });
        const [result] = await connection.query(`INSERT INTO interaccion
            (conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`, [
            cases[0].advisorId, cases[0].clientId, interaction.typificationId, interaction.statusId,
            interaction.reason || '', interaction.date, interaction.startTime, interaction.endTime,
            interaction.duration, interaction.observation
        ]);
        if (Number(interaction.statusId) === 1) {
            await connection.query('UPDATE caso SET cerCas = TRUE, fecCieCas = CURDATE(), fecSegCas = NULL WHERE codCas = ?', [caseId]);
        } else {
            await connection.query('UPDATE caso SET fecSegCas = ?, cerCas = FALSE WHERE codCas = ?', [interaction.followupAt, caseId]);
        }
        await connection.commit();
        return { id: result.insertId, caseId: Number(caseId), caseClosed: Number(interaction.statusId) === 1 };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

const listarInteraccionesHoy = async agentId => {
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, c.conCli AS clientId, c.nomCli AS clientName, ca.nomCam AS campaign,
               'Llamada' AS channel, t.nomTip AS typification, i.obsInt AS observation,
               i.tieProInt AS duration, e.nomEstCas AS status
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        WHERE ba.idAgeAse = ? AND i.fecInt = CURDATE()
        ORDER BY i.horIniInt DESC, i.codInt DESC`, [agentId]);
    return rows;
};

module.exports = { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy, listarCasosAgente, listarTrazabilidadCliente, crearSeguimientoModelo };
