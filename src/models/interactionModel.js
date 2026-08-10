const { pool } = require('../config/database');

const obtenerCatalogosModelo = async campaignId => {
    const [channels] = await pool.query('SELECT idCanInt AS id, nomCanInt AS name FROM canalContacto ORDER BY idCanInt');
    const [statuses] = await pool.query('SELECT idEstCas AS id, nomEstCas AS name FROM estadoCaso ORDER BY idEstCas');
    const [typifications] = await pool.query('SELECT codTip AS id, nomTip AS name FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaignId]);
    return { channels, statuses, typifications };
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
            interaccion.typificationId, interaccion.channelId, interaccion.statusId, interaccion.reason,
            interaccion.date, interaccion.startTime, interaccion.endTime, interaccion.duration, interaccion.observation,
            interaccion.assignmentId, interaccion.agentId
        ]);
        if (!result.affectedRows) throw Object.assign(new Error('La asignación no pertenece al agente autenticado'), { status: 400 });
        await connection.query('UPDATE asignacionLlamada SET conAteAsi = 1 WHERE codAsi = ?', [interaccion.assignmentId]);
        if (interaccion.createCase) {
            await connection.query('INSERT INTO caso (codIntCas, comIntCas, fecIniCas, fecCieCas) VALUES (?, ?, CURDATE(), NULL)', [result.insertId, interaccion.caseComment || interaccion.observation]);
        }
        await connection.commit();
        return { id: result.insertId, caseCreated: Boolean(interaccion.createCase) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
};

const listarInteraccionesHoy = async agentId => {
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, c.conCli AS clientId, c.nomCli AS clientName, ca.nomCam AS campaign,
               cc.nomCanInt AS channel, t.nomTip AS typification, i.obsInt AS observation,
               i.tieProInt AS duration, e.nomEstCas AS status
        FROM interaccion i
        INNER JOIN baseDatosAsesor ba ON ba.conAse = i.conAseInt
        INNER JOIN baseDatosCliente c ON c.conCli = i.conCliInt
        INNER JOIN campana ca ON ca.codCam = c.codCamCli
        INNER JOIN canalContacto cc ON cc.idCanInt = i.idCanInt
        INNER JOIN tipificacion t ON t.codTip = i.codTipInt
        INNER JOIN estadoCaso e ON e.idEstCas = i.idEstCasInt
        WHERE ba.idAgeAse = ? AND i.fecInt = CURDATE()
        ORDER BY i.horIniInt DESC, i.codInt DESC`, [agentId]);
    return rows;
};

module.exports = { obtenerCatalogosModelo, crearInteraccionModelo, listarInteraccionesHoy };
