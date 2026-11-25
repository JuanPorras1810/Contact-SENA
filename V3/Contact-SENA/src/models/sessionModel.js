const { pool } = require('../config/database');

const pausasActivas = new Map();
const configuracion = rol => {
    const supervisor = rol === 'supervisor';
    const sufijo = supervisor ? 'RegSup' : 'RegAge';
    return {
        table: supervisor ? 'registroSupervisor' : 'registroAgente',
        userColumn: supervisor ? 'idSupRegSup' : 'idAgeRegAge',
        startColumn: `fecHoraIni${sufijo}`,
        endColumn: `fecHoraCie${sufijo}`,
        totalColumn: `tieTot${sufijo}`,
        pauseColumn: `tiempoPausa${sufijo}`
    };
};
const keyFor = (rol, id) => `${rol}:${id}`;
const durationSeconds = startedAt => Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
const formatDuration = seconds => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const cerrarRegistroActivo = async (rol, idUsuario) => {
    const config = configuracion(rol);
    const pausa = pausasActivas.get(keyFor(rol, idUsuario));
    const pausaActual = pausa ? formatDuration(durationSeconds(pausa.startedAt)) : '00:00:00';
    await pool.query(
        `UPDATE ${config.table} SET ${config.endColumn} = NOW(),
         ${config.totalColumn} = SEC_TO_TIME(GREATEST(0, TIMESTAMPDIFF(SECOND, ${config.startColumn}, NOW()) -
         TIME_TO_SEC(COALESCE(${config.pauseColumn}, '00:00:00')) - TIME_TO_SEC(?))),
         ${config.pauseColumn} = ADDTIME(COALESCE(${config.pauseColumn}, '00:00:00'), ?)
         WHERE ${config.userColumn} = ? AND ${config.endColumn} IS NULL
         ORDER BY ${config.startColumn} DESC LIMIT 1`,
        [pausaActual, pausaActual, idUsuario]
    );
    pausasActivas.delete(keyFor(rol, idUsuario));
};

const iniciarSesionModelo = async (rol, idUsuario) => {
    const config = configuracion(rol);
    await cerrarRegistroActivo(rol, idUsuario);
    await pool.query(
        `INSERT INTO ${config.table} (${config.userColumn}, ${config.startColumn}, ${config.pauseColumn})
         VALUES (?, NOW(), '00:00:00')`,
        [idUsuario]
    );
};

const cerrarSesionModelo = async (rol, idUsuario) => cerrarRegistroActivo(rol, idUsuario);

const cambiarPausaModelo = async (rol, idUsuario, pausar, pauseStartedAt) => {
    const config = configuracion(rol);
    const key = keyFor(rol, idUsuario);
    const [rows] = await pool.query(
        `SELECT ${config.pauseColumn} AS pauseTime FROM ${config.table}
         WHERE ${config.userColumn} = ? AND ${config.endColumn} IS NULL
         ORDER BY ${config.startColumn} DESC LIMIT 1`,
        [idUsuario]
    );
    if (!rows.length) throw Object.assign(new Error('No hay una sesión activa'), { status: 400 });

    let pausa = pausasActivas.get(key);
    if (pausar) {
        if (!pausa) {
            pausa = { startedAt: Date.now() };
            pausasActivas.set(key, pausa);
        }
        return { paused: true, pauseTime: rows[0].pauseTime, pauseStartedAt: new Date(pausa.startedAt).toISOString() };
    }

    const inicioPausa = pausa?.startedAt ?? (pauseStartedAt ? new Date(pauseStartedAt).getTime() : null);
    if (inicioPausa && Number.isFinite(inicioPausa)) {
        const duracion = formatDuration(durationSeconds(inicioPausa));
        await pool.query(
            `UPDATE ${config.table} SET ${config.pauseColumn} =
             ADDTIME(COALESCE(${config.pauseColumn}, '00:00:00'), ?)
             WHERE ${config.userColumn} = ? AND ${config.endColumn} IS NULL
             ORDER BY ${config.startColumn} DESC LIMIT 1`,
            [duracion, idUsuario]
        );
        pausasActivas.delete(key);
    }
    const [updated] = await pool.query(
        `SELECT ${config.pauseColumn} AS pauseTime FROM ${config.table}
         WHERE ${config.userColumn} = ? AND ${config.endColumn} IS NULL
         ORDER BY ${config.startColumn} DESC LIMIT 1`,
        [idUsuario]
    );
    return { paused: false, pauseTime: updated[0]?.pauseTime || '00:00:00' };
};

const obtenerPausaModelo = async (rol, idUsuario) => {
    const config = configuracion(rol);
    const [rows] = await pool.query(
        `SELECT ${config.pauseColumn} AS pauseTime FROM ${config.table}
         WHERE ${config.userColumn} = ? AND ${config.endColumn} IS NULL
         ORDER BY ${config.startColumn} DESC LIMIT 1`,
        [idUsuario]
    );
    const pausa = pausasActivas.get(keyFor(rol, idUsuario));
    return {
        paused: Boolean(pausa),
        pauseTime: rows[0]?.pauseTime || '00:00:00',
        pauseStartedAt: pausa ? new Date(pausa.startedAt).toISOString() : null
    };
};

module.exports = { iniciarSesionModelo, cerrarSesionModelo, cambiarPausaModelo, obtenerPausaModelo };
