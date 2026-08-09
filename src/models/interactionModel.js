const { pool } = require('../config/database');

const getCatalogs = async campaignId => {
    const [channels] = await pool.query('SELECT idCanInt AS id, nomCanInt AS name FROM canalContacto ORDER BY idCanInt');
    const [statuses] = await pool.query('SELECT idEstCas AS id, nomEstCas AS name FROM estadoCaso ORDER BY idEstCas');
    const [typifications] = await pool.query('SELECT codTip AS id, nomTip AS name FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaignId]);
    return { channels, statuses, typifications };
};

const createInteraction = async interaction => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(`INSERT INTO interaccion
            (conAseInt, conCliInt, codTipInt, idCanInt, idEstCasInt, motInt, fecInt, horIniInt, horFinInt, tieProInt, obsInt)
            SELECT ba.conAse, al.conCliAsi, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM asignacionLlamada al
            INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
            WHERE al.codAsi = ? AND ba.idAgeAse = ? LIMIT 1`, [
            interaction.typificationId, interaction.channelId, interaction.statusId, interaction.reason,
            interaction.date, interaction.startTime, interaction.endTime, interaction.duration, interaction.observation,
            interaction.assignmentId, interaction.agentId
        ]);
        if (!result.affectedRows) throw Object.assign(new Error('La asignación no pertenece al agente autenticado'), { status: 400 });
        await connection.query('UPDATE asignacionLlamada SET conAteAsi = 1 WHERE codAsi = ?', [interaction.assignmentId]);
        if (interaction.createCase) {
            await connection.query('INSERT INTO caso (codIntCas, comIntCas, fecIniCas, fecCieCas) VALUES (?, ?, CURDATE(), NULL)', [result.insertId, interaction.caseComment || interaction.observation]);
        }
        await connection.commit();
        return { id: result.insertId, caseCreated: Boolean(interaction.createCase) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
};

const listTodayInteractions = async agentId => {
    const [rows] = await pool.query(`
        SELECT i.codInt AS id, c.nomCli AS client, ca.nomCam AS campaign,
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

module.exports = { getCatalogs, createInteraction, listTodayInteractions };
