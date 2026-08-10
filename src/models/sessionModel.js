const { pool } = require('../config/database');

const iniciarSesionModelo = async (rol, idUsuario) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const columnaInicio = rol === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const columnaCierre = rol === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const columnaTotal = rol === 'supervisor' ? 'tieTotRegSup' : 'tieTotRegAge';
    // Cierra un registro abandonado antes de crear el nuevo intervalo de acceso.
    await pool.query(`UPDATE ${tabla} SET ${columnaCierre} = NOW(), ${columnaTotal} = TIMEDIFF(NOW(), ${columnaInicio}) WHERE ${columnaUsuario} = ? AND ${columnaCierre} IS NULL`, [idUsuario]);
    await pool.query(`INSERT INTO ${tabla} (${columnaUsuario}, ${columnaInicio}) VALUES (?, NOW())`, [idUsuario]);
};

const cerrarSesionModelo = async (rol, idUsuario) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const columnaInicio = rol === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const columnaCierre = rol === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const columnaTotal = rol === 'supervisor' ? 'tieTotRegSup' : 'tieTotRegAge';
    await pool.query(`UPDATE ${tabla} SET ${columnaCierre} = NOW(), ${columnaTotal} = TIMEDIFF(NOW(), ${columnaInicio}) WHERE ${columnaUsuario} = ? AND ${columnaCierre} IS NULL ORDER BY ${columnaInicio} DESC LIMIT 1`, [idUsuario]);
};

module.exports = { iniciarSesionModelo, cerrarSesionModelo };
