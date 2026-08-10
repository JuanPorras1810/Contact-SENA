const { pool } = require('../config/database');

const crearAsignacionModelo = async ({ agentId, campaignId }) => {
    const [agents] = await pool.query('SELECT idAge FROM agente WHERE idAge = ?', [agentId]);
    const [campaigns] = await pool.query('SELECT codCam FROM campana WHERE codCam = ?', [campaignId]);
    if (!agents.length || !campaigns.length) throw Object.assign(new Error('El agente o la campaña no existen'), { status: 400 });
    const [existing] = await pool.query('SELECT conAse FROM baseDatosAsesor WHERE idAgeAse = ? AND codCamAse = ?', [agentId, campaignId]);
    if (existing.length) throw Object.assign(new Error('La asignación de ese agente y campaña ya está registrada'), { status: 409 });
    const [result] = await pool.query('INSERT INTO baseDatosAsesor (idAgeAse, codCamAse) VALUES (?, ?)', [agentId, campaignId]);
    return { id: result.insertId, agentId, campaignId };
};

const actualizarAsignacionModelo = async (idAsignacion, { agentId, campaignId }) => {
    const [agentes] = await pool.query('SELECT idAge FROM agente WHERE idAge = ?', [agentId]);
    const [campanas] = await pool.query('SELECT codCam FROM campana WHERE codCam = ?', [campaignId]);
    if (!agentes.length || !campanas.length) throw Object.assign(new Error('El agente o la campaña no existen'), { status: 400 });
    const [duplicadas] = await pool.query('SELECT conAse FROM baseDatosAsesor WHERE idAgeAse = ? AND codCamAse = ? AND conAse <> ?', [agentId, campaignId, idAsignacion]);
    if (duplicadas.length) throw Object.assign(new Error('El agente ya tiene asignada esa campaña'), { status: 409 });
    const [resultado] = await pool.query('UPDATE baseDatosAsesor SET idAgeAse = ?, codCamAse = ? WHERE conAse = ?', [agentId, campaignId, idAsignacion]);
    if (!resultado.affectedRows) throw Object.assign(new Error('La asignación no existe'), { status: 404 });
    return { id: idAsignacion, agentId, campaignId };
};

const reequilibrarClientesPendientes = async () => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [connected] = await connection.query(`SELECT ba.conAse, ba.idAgeAse, ba.codCamAse
            FROM baseDatosAsesor ba INNER JOIN registroAgente r ON r.idAgeRegAge = ba.idAgeAse
            WHERE r.fecHoraCieRegAge IS NULL
            GROUP BY ba.conAse, ba.idAgeAse, ba.codCamAse`);
        const [clients] = await connection.query(`SELECT c.conCli, c.codCamCli, al.codAsi, al.conAseAsi
            FROM baseDatosCliente c LEFT JOIN asignacionLlamada al ON al.conCliAsi = c.conCli AND (al.conAteAsi = 0 OR al.conAteAsi IS NULL)
            WHERE ((al.codAsi IS NULL AND NOT EXISTS (SELECT 1 FROM asignacionLlamada done WHERE done.conCliAsi = c.conCli AND done.conAteAsi = 1)) OR (al.codAsi IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM baseDatosAsesor ba2 INNER JOIN registroAgente r2 ON r2.idAgeRegAge = ba2.idAgeAse
                WHERE ba2.conAse = al.conAseAsi AND r2.fecHoraCieRegAge IS NULL)))`);
        const connectedByCampaign = new Map();
        connected.forEach(agent => {
            if (!connectedByCampaign.has(agent.codCamAse)) connectedByCampaign.set(agent.codCamAse, []);
            connectedByCampaign.get(agent.codCamAse).push({ ...agent, load: 0 });
        });
        const [loads] = await connection.query(`SELECT al.conAseAsi AS assignmentId, COUNT(*) AS total
            FROM asignacionLlamada al INNER JOIN baseDatosAsesor ba ON ba.conAse = al.conAseAsi
            INNER JOIN registroAgente r ON r.idAgeRegAge = ba.idAgeAse AND r.fecHoraCieRegAge IS NULL
            WHERE al.conAteAsi = 0 OR al.conAteAsi IS NULL GROUP BY al.conAseAsi`);
        loads.forEach(item => connected.forEach(agent => { if (agent.conAse === item.assignmentId) agent.load = Number(item.total); }));
        for (const client of clients) {
            const candidates = connectedByCampaign.get(client.codCamCli) || [];
            if (!candidates.length) continue;
            const target = candidates.reduce((lowest, item) => item.load < lowest.load ? item : lowest, candidates[0]);
            if (client.codAsi) await connection.query('UPDATE asignacionLlamada SET conAseAsi = ?, fecAsi = CURDATE() WHERE codAsi = ?', [target.conAse, client.codAsi]);
            else await connection.query('INSERT INTO asignacionLlamada (conAseAsi, conCliAsi, fecAsi, conAteAsi) VALUES (?, ?, CURDATE(), 0)', [target.conAse, client.conCli]);
            target.load += 1;
        }
        await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

const reasignarClientesPendientes = async agentId => {
    await reequilibrarClientesPendientes();
};

module.exports = { crearAsignacionModelo, actualizarAsignacionModelo, asignarClientesPendientes: reequilibrarClientesPendientes, reasignarClientesPendientes, reequilibrarClientesPendientes };
