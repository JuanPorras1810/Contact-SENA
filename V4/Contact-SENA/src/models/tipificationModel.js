const { pool } = require('../config/database');

const listarTipificaciones = async () => {
    const [rows] = await pool.query(`
        SELECT t.codTip AS id, t.nomTip AS name, t.idEstCasTip AS statusId, e.nomEstCas AS status,
               (SELECT COUNT(*) FROM interaccion i WHERE i.codTipInt = t.codTip) AS usageCount
        FROM tipificacion t
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        ORDER BY t.nomTip, t.codTip`);
    return rows;
};

const listarEstadosCaso = async () => {
    const [rows] = await pool.query('SELECT idEstCas AS id, nomEstCas AS name FROM estadoCaso ORDER BY idEstCas');
    return rows;
};

const validarEstadoCaso = async statusId => {
    const [[estado]] = await pool.query('SELECT idEstCas FROM estadoCaso WHERE idEstCas = ?', [statusId]);
    if (!estado) throw Object.assign(new Error('El estado de caso seleccionado no existe'), { status: 400 });
};

const crearTipificacion = async ({ name, statusId }) => {
    await validarEstadoCaso(statusId);
    const [result] = await pool.query('INSERT INTO tipificacion (nomTip, idEstCasTip) VALUES (?, ?)', [name, statusId]);
    return { id: result.insertId, name, statusId };
};

const actualizarTipificacion = async (id, { name, statusId }) => {
    await validarEstadoCaso(statusId);
    const [[existente]] = await pool.query('SELECT codTip FROM tipificacion WHERE codTip = ?', [id]);
    if (!existente) throw Object.assign(new Error('La tipificación no existe'), { status: 404 });
    await pool.query('UPDATE tipificacion SET nomTip = ?, idEstCasTip = ? WHERE codTip = ?', [name, statusId, id]);
    return { id: Number(id), name, statusId };
};

const eliminarTipificacion = async id => {
    const [[usage]] = await pool.query('SELECT COUNT(*) AS total FROM interaccion WHERE codTipInt = ?', [id]);
    if (Number(usage.total) > 0) throw Object.assign(new Error('No se puede eliminar una tipificación con interacciones registradas'), { status: 409 });
    const [result] = await pool.query('DELETE FROM tipificacion WHERE codTip = ?', [id]);
    if (!result.affectedRows) throw Object.assign(new Error('La tipificación no existe'), { status: 404 });
};

module.exports = { listarTipificaciones, listarEstadosCaso, crearTipificacion, actualizarTipificacion, eliminarTipificacion };
