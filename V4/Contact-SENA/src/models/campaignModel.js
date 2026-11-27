const { pool } = require('../config/database');

const defaultTipificationNames = ['Contacto efectivo', 'Volver a llamar', 'Buzón de mensajes', 'Número equivocado'];

const obtenerIdsPredeterminados = async connection => {
    const [rows] = await connection.query(
        'SELECT codTip AS id FROM tipificacion WHERE LOWER(nomTip) IN (?, ?, ?, ?) ORDER BY FIELD(LOWER(nomTip), ?, ?, ?, ?)',
        [...defaultTipificationNames.map(name => name.toLowerCase()), ...defaultTipificationNames.map(name => name.toLowerCase())]
    );
    return rows.map(row => Number(row.id));
};

const validarTipificaciones = async (connection, ids) => {
    const unicas = [...new Set((ids || []).map(Number).filter(Number.isInteger))];
    if (!unicas.length) throw Object.assign(new Error('La campaña debe tener al menos una tipificación asignada'), { status: 400 });
    const [rows] = await connection.query(`SELECT codTip FROM tipificacion WHERE codTip IN (${unicas.map(() => '?').join(',')})`, unicas);
    if (rows.length !== unicas.length) throw Object.assign(new Error('Una o más tipificaciones no existen'), { status: 400 });
    return unicas;
};

const listarCampanas = async () => {
    const [rows] = await pool.query(`
        SELECT ca.codCam AS id, ca.nomCam AS name, ca.fecIniCam AS startDate,
               ca.fecFinCam AS endDate, ca.proCam AS fileUrl,
               COUNT(ct.codTip) AS typificationCount
        FROM campana ca
        LEFT JOIN campanaTipificacion ct ON ct.codCam = ca.codCam
        GROUP BY ca.codCam ORDER BY ca.codCam DESC`);
    return rows;
};

const listarTipificaciones = async campaignId => {
    const [rows] = await pool.query(`
        SELECT t.codTip AS id, t.nomTip AS name, t.idEstCasTip AS statusId, e.nomEstCas AS status
        FROM campanaTipificacion ct
        INNER JOIN tipificacion t ON t.codTip = ct.codTip
        INNER JOIN estadoCaso e ON e.idEstCas = t.idEstCasTip
        WHERE ct.codCam = ? ORDER BY t.nomTip, t.codTip`, [campaignId]);
    return rows;
};

const asignarTipificaciones = async (connection, campaignId, ids) => {
    await connection.query('DELETE FROM campanaTipificacion WHERE codCam = ?', [campaignId]);
    for (const id of ids) await connection.query('INSERT INTO campanaTipificacion (codCam, codTip) VALUES (?, ?)', [campaignId, id]);
};

const crearCampanaModelo = async campana => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const tipificationIds = campana.typificationIds?.length
            ? await validarTipificaciones(connection, campana.typificationIds)
            : await validarTipificaciones(connection, await obtenerIdsPredeterminados(connection));
        const [resultado] = await connection.query(
            'INSERT INTO campana (nomCam, fecIniCam, fecFinCam, proCam) VALUES (?, ?, ?, ?)',
            [campana.name, campana.startDate, campana.endDate, campana.fileUrl || null]
        );
        await asignarTipificaciones(connection, resultado.insertId, tipificationIds);
        await connection.commit();
        return { id: resultado.insertId, ...campana, typificationIds: tipificationIds };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

const actualizarCampanaModelo = async (id, campana) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const tipificationIds = campana.typificationIds === undefined
            ? null
            : await validarTipificaciones(connection, campana.typificationIds);
        const fields = ['nomCam = ?', 'fecIniCam = ?', 'fecFinCam = ?'];
        const values = [campana.name, campana.startDate, campana.endDate];
        if (campana.fileUrl !== undefined) { fields.push('proCam = ?'); values.push(campana.fileUrl); }
        values.push(id);
        const [result] = await connection.query(`UPDATE campana SET ${fields.join(', ')} WHERE codCam = ?`, values);
        if (!result.affectedRows) throw Object.assign(new Error('La campaña no existe'), { status: 404 });
        if (tipificationIds) await asignarTipificaciones(connection, id, tipificationIds);
        await connection.commit();
        return { id: Number(id), ...campana, ...(tipificationIds ? { typificationIds: tipificationIds } : {}) };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

module.exports = { listarCampanas, listarTipificaciones, crearCampanaModelo, actualizarCampanaModelo };
