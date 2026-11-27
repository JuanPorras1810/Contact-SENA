const { pool } = require('../config/database');

const obtenerTiemposSupervisor = async ({ start, end, agentId, search }) => {
    const conditions = [];
    const params = [];
    if (start) { conditions.push('DATE(r.fecHoraIniRegAge) >= ?'); params.push(start); }
    if (end) { conditions.push('DATE(r.fecHoraIniRegAge) <= ?'); params.push(end); }
    if (agentId && agentId !== 'all') { conditions.push('r.idAgeRegAge = ?'); params.push(agentId); }
    if (search) { conditions.push('(a.nomAge LIKE ? OR a.idAge LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`
        SELECT r.codRegAge AS code, r.idAgeRegAge AS userId, a.nomAge AS name,
               r.fecHoraIniRegAge AS startedAt, r.fecHoraCieRegAge AS endedAt,
                r.tieTotRegAge AS totalTime, r.tiempoPausaRegAge AS pauseTime
        FROM registroAgente r
        INNER JOIN agente a ON a.idAge = r.idAgeRegAge
        ${where} ORDER BY r.fecHoraIniRegAge DESC`, params);
    return rows;
};

const obtenerTiemposAgente = async ({ start, end, agentId, search }) => {
    const conditions = [];
    const params = [];
    if (start) { conditions.push('DATE(r.fecHoraIniRegAge) >= ?'); params.push(start); }
    if (end) { conditions.push('DATE(r.fecHoraIniRegAge) <= ?'); params.push(end); }
    if (agentId && agentId !== 'all') { conditions.push('r.idAgeRegAge = ?'); params.push(agentId); }
    if (search) { conditions.push('(a.nomAge LIKE ? OR a.idAge LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`
        SELECT r.codRegAge AS code, r.idAgeRegAge AS userId, a.nomAge AS name,
               r.fecHoraIniRegAge AS startedAt, r.fecHoraCieRegAge AS endedAt,
                r.tieTotRegAge AS totalTime, r.tiempoPausaRegAge AS pauseTime
        FROM registroAgente r
        INNER JOIN agente a ON a.idAge = r.idAgeRegAge
        ${where} ORDER BY r.fecHoraIniRegAge DESC`, params);
    return rows;
};

const obtenerTiempoSupervisor = async ({ start, end, search }, supervisorId) => {
    const conditions = ['r.idSupRegSup = ?'];
    const params = [supervisorId];
    if (start) { conditions.push('DATE(r.fecHoraIniRegSup) >= ?'); params.push(start); }
    if (end) { conditions.push('DATE(r.fecHoraIniRegSup) <= ?'); params.push(end); }
    if (search) { conditions.push('(s.nomSup LIKE ? OR s.idSup LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await pool.query(`
        SELECT r.codRegSup AS code, r.idSupRegSup AS userId, s.nomSup AS name,
               r.fecHoraIniRegSup AS startedAt, r.fecHoraCieRegSup AS endedAt,
                r.tieTotRegSup AS totalTime, r.tiempoPausaRegSup AS pauseTime
        FROM registroSupervisor r
        INNER JOIN supervisor s ON s.idSup = r.idSupRegSup
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.fecHoraIniRegSup DESC`, params);
    return rows;
};

module.exports = { obtenerTiemposSupervisor, obtenerTiemposAgente, obtenerTiempoSupervisor };
