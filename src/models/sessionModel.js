const { pool } = require('../config/database');

const startSession = async (role, userId) => {
    const table = role === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const userColumn = role === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const startColumn = role === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const closeColumn = role === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const [openRows] = await pool.query(`SELECT 1 FROM ${table} WHERE ${userColumn} = ? AND ${closeColumn} IS NULL LIMIT 1`, [userId]);
    if (openRows.length) return;
    await pool.query(`INSERT INTO ${table} (${userColumn}, ${startColumn}) VALUES (?, NOW())`, [userId]);
};

const closeSession = async (role, userId) => {
    const table = role === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const userColumn = role === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const startColumn = role === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const closeColumn = role === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const totalColumn = role === 'supervisor' ? 'tieTotRegSup' : 'tieTotRegAge';
    await pool.query(`UPDATE ${table} SET ${closeColumn} = NOW(), ${totalColumn} = TIMEDIFF(NOW(), ${startColumn}) WHERE ${userColumn} = ? AND ${closeColumn} IS NULL ORDER BY ${startColumn} DESC LIMIT 1`, [userId]);
};

module.exports = { startSession, closeSession };
