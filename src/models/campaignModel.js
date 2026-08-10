const { pool } = require('../config/database');

const listarCampanas = async () => {
    const [rows] = await pool.query(`
        SELECT ca.codCam AS id, ca.nomCam AS name, ca.fecIniCam AS startDate,
               ca.fecFinCam AS endDate, ca.proCam AS fileUrl, ca.estadoCam AS active,
               COUNT(t.codTip) AS typificationCount
        FROM campana ca
        LEFT JOIN tipificacion t ON t.codCamTip = ca.codCam
        GROUP BY ca.codCam ORDER BY ca.codCam DESC`);
    return rows;
};

const listarTipificaciones = async campaignId => {
    const [rows] = await pool.query('SELECT codTip AS id, nomTip AS name FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaignId]);
    return rows;
};

const crearCampanaModelo = async campana => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [resultado] = await connection.query('INSERT INTO campana (nomCam, fecIniCam, fecFinCam, proCam, estadoCam) VALUES (?, ?, ?, ?, ?)', [campana.name, campana.startDate, campana.endDate, campana.fileUrl || null, campana.status !== 'Pausada']);
        const tipificaciones = campana.typifications?.length ? campana.typifications : ['Contesto - Interesado', 'Contesto - No Interesado', 'Agendado / Agendar Rellamada', 'Tercero / No Titular', 'No Contesta', 'Ocupado', 'Buzón de Voz', 'Número Equivocado', 'Llamada Cortada'];
        for (const nombre of tipificaciones) await connection.query('INSERT INTO tipificacion (codCamTip, nomTip) VALUES (?, ?)', [resultado.insertId, nombre]);
        await connection.commit();
        return { id: resultado.insertId, ...campana, typifications: tipificaciones };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

const actualizarCampanaModelo = async (id, campana) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const fields = ['nomCam = ?', 'fecIniCam = ?', 'fecFinCam = ?'];
        const values = [campana.name, campana.startDate, campana.endDate];
        if (campana.fileUrl !== undefined) { fields.push('proCam = ?'); values.push(campana.fileUrl); }
        if (campana.status) { fields.push('estadoCam = ?'); values.push(campana.status !== 'Pausada'); }
        values.push(id);
        await connection.query(`UPDATE campana SET ${fields.join(', ')} WHERE codCam = ?`, values);
        if (campana.typifications !== null && campana.typifications !== undefined) {
            await connection.query('DELETE FROM tipificacion WHERE codCamTip = ?', [id]);
            for (const nombre of campana.typifications) await connection.query('INSERT INTO tipificacion (codCamTip, nomTip) VALUES (?, ?)', [id, nombre]);
        }
        await connection.commit();
        return { id, ...campana };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
};

module.exports = { listarCampanas, listarTipificaciones, crearCampanaModelo, actualizarCampanaModelo };
