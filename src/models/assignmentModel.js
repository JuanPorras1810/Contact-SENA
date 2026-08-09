const { pool } = require('../config/database');

const createAssignment = async ({ agentId, campaignId }) => {
    const [result] = await pool.query('INSERT INTO baseDatosAsesor (idAgeAse, codCamAse) VALUES (?, ?)', [agentId, campaignId]);
    return { id: result.insertId, agentId, campaignId };
};

const assignPendingClients = async () => {
    await pool.query(`INSERT INTO asignacionLlamada (conAseAsi, conCliAsi, fecAsi, conAteAsi)
        SELECT ba.conAse, c.conCli, CURDATE(), 0
        FROM baseDatosCliente c
        INNER JOIN baseDatosAsesor ba ON ba.codCamAse = c.codCamCli
        INNER JOIN registroAgente r ON r.idAgeRegAge = ba.idAgeAse AND r.fecHoraCieRegAge IS NULL
        WHERE NOT EXISTS (SELECT 1 FROM asignacionLlamada x WHERE x.conCliAsi = c.conCli)`);
};

const reassignPendingClients = async agentId => {
    const [pending] = await pool.query(`SELECT al.codAsi, c.codCamCli
        FROM asignacionLlamada al
        INNER JOIN baseDatosCliente c ON c.conCli = al.conCliAsi
        INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
        WHERE ba.idAgeAse = ? AND (al.conAteAsi IS NULL OR al.conAteAsi = 0)`, [agentId]);
    for (const item of pending) {
        const [candidates] = await pool.query(`SELECT ba.conAse
            FROM baseDatosAsesor ba
            INNER JOIN registroAgente r ON r.idAgeRegAge = ba.idAgeAse AND r.fecHoraCieRegAge IS NULL
            WHERE ba.codCamAse = ? AND ba.idAgeAse <> ? ORDER BY r.fecHoraIniRegAge LIMIT 1`, [item.codCamCli, agentId]);
        if (candidates[0]) await pool.query('UPDATE asignacionLlamada SET conAseAsi = ?, fecAsi = CURDATE() WHERE codAsi = ?', [candidates[0].conAse, item.codAsi]);
    }
};

module.exports = { createAssignment, assignPendingClients, reassignPendingClients };
