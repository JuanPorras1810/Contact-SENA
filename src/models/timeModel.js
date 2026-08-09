const { pool } = require('../config/database');

const getSupervisorTimes = async ({ start, end, agentId, search }) => {
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
               r.tieTotRegAge AS totalTime
        FROM registroAgente r
        INNER JOIN agente a ON a.idAge = r.idAgeRegAge
        ${where} ORDER BY r.fecHoraIniRegAge DESC`, params);
    return rows;
};

const getAgentTimes = async ({ start, end, agentId, search }) => {
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
               r.tieTotRegAge AS totalTime
        FROM registroAgente r
        INNER JOIN agente a ON a.idAge = r.idAgeRegAge
        ${where} ORDER BY r.fecHoraIniRegAge DESC`, params);
    return rows;
};

module.exports = { getSupervisorTimes, getAgentTimes };
