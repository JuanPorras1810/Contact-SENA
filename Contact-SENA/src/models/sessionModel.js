const { pool } = require('../config/database');

const iniciarSesionModelo = async (rol, idUsuario) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const columnaInicio = rol === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const columnaCierre = rol === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const columnaTotal = rol === 'supervisor' ? 'tieTotRegSup' : 'tieTotRegAge';
    // Cierra un registro abandonado antes de crear el nuevo intervalo de acceso.
    await pool.query(`UPDATE ${tabla} SET ${columnaCierre} = NOW(), ${columnaTotal} = SEC_TO_TIME(GREATEST(0, TIMESTAMPDIFF(SECOND, ${columnaInicio}, NOW()) - TIME_TO_SEC(COALESCE(tiempoPausa, '00:00:00')) - COALESCE(TIMESTAMPDIFF(SECOND, inicioPausa, NOW()), 0))), inicioPausa = NULL WHERE ${columnaUsuario} = ? AND ${columnaCierre} IS NULL`, [idUsuario]);
    await pool.query(`INSERT INTO ${tabla} (${columnaUsuario}, ${columnaInicio}, tiempoPausa, inicioPausa) VALUES (?, NOW(), '00:00:00', NULL)`, [idUsuario]);
};

const cerrarSesionModelo = async (rol, idUsuario) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const columnaInicio = rol === 'supervisor' ? 'fecHoraIniRegSup' : 'fecHoraIniRegAge';
    const columnaCierre = rol === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const columnaTotal = rol === 'supervisor' ? 'tieTotRegSup' : 'tieTotRegAge';
    await pool.query(`UPDATE ${tabla} SET ${columnaCierre} = NOW(), ${columnaTotal} = SEC_TO_TIME(GREATEST(0, TIMESTAMPDIFF(SECOND, ${columnaInicio}, NOW()) - TIME_TO_SEC(COALESCE(tiempoPausa, '00:00:00')) - COALESCE(TIMESTAMPDIFF(SECOND, inicioPausa, NOW()), 0))), inicioPausa = NULL WHERE ${columnaUsuario} = ? AND ${columnaCierre} IS NULL ORDER BY ${columnaInicio} DESC LIMIT 1`, [idUsuario]);
};

const cambiarPausaModelo = async (rol, idUsuario, pausar) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const [rows] = await pool.query(`SELECT inicioPausa, tiempoPausa FROM ${tabla} WHERE ${columnaUsuario} = ? AND fecHoraCie${rol === 'supervisor' ? 'RegSup' : 'RegAge'} IS NULL ORDER BY fecHoraIni${rol === 'supervisor' ? 'RegSup' : 'RegAge'} DESC LIMIT 1`, [idUsuario]);
    if (!rows.length) throw Object.assign(new Error('No hay una sesión activa'), { status: 400 });
    if (pausar) {
        if (rows[0].inicioPausa) return { paused: true, pauseTime: rows[0].tiempoPausa, pauseStartedAt: rows[0].inicioPausa };
        await pool.query(`UPDATE ${tabla} SET inicioPausa = NOW() WHERE ${columnaUsuario} = ? AND inicioPausa IS NULL AND fecHoraCie${rol === 'supervisor' ? 'RegSup' : 'RegAge'} IS NULL ORDER BY fecHoraIni${rol === 'supervisor' ? 'RegSup' : 'RegAge'} DESC LIMIT 1`, [idUsuario]);
        return { paused: true, pauseTime: rows[0].tiempoPausa, pauseStartedAt: new Date() };
    }
    await pool.query(`UPDATE ${tabla} SET tiempoPausa = ADDTIME(COALESCE(tiempoPausa, '00:00:00'), IF(inicioPausa IS NULL, '00:00:00', TIMEDIFF(NOW(), inicioPausa))), inicioPausa = NULL WHERE ${columnaUsuario} = ? AND fecHoraCie${rol === 'supervisor' ? 'RegSup' : 'RegAge'} IS NULL ORDER BY fecHoraIni${rol === 'supervisor' ? 'RegSup' : 'RegAge'} DESC LIMIT 1`, [idUsuario]);
    const [updated] = await pool.query(`SELECT tiempoPausa FROM ${tabla} WHERE ${columnaUsuario} = ? AND fecHoraCie${rol === 'supervisor' ? 'RegSup' : 'RegAge'} IS NULL ORDER BY fecHoraIni${rol === 'supervisor' ? 'RegSup' : 'RegAge'} DESC LIMIT 1`, [idUsuario]);
    return { paused: false, pauseTime: updated[0]?.tiempoPausa || '00:00:00' };
};

const obtenerPausaModelo = async (rol, idUsuario) => {
    const tabla = rol === 'supervisor' ? 'registroSupervisor' : 'registroAgente';
    const columnaUsuario = rol === 'supervisor' ? 'idSupRegSup' : 'idAgeRegAge';
    const cierre = rol === 'supervisor' ? 'fecHoraCieRegSup' : 'fecHoraCieRegAge';
    const [rows] = await pool.query(`SELECT inicioPausa, tiempoPausa FROM ${tabla} WHERE ${columnaUsuario} = ? AND ${cierre} IS NULL ORDER BY fecHoraIni${rol === 'supervisor' ? 'RegSup' : 'RegAge'} DESC LIMIT 1`, [idUsuario]);
    return { paused: Boolean(rows[0]?.inicioPausa), pauseTime: rows[0]?.tiempoPausa || '00:00:00', pauseStartedAt: rows[0]?.inicioPausa || null };
};

module.exports = { iniciarSesionModelo, cerrarSesionModelo, cambiarPausaModelo, obtenerPausaModelo };
