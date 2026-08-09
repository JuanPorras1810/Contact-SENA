const { pool } = require('../config/database');

const listAdvisors = async () => {
    const [rows] = await pool.query(`
        SELECT a.idAge AS id, a.nomAge AS name, a.emaAge AS email,
               a.telAge AS phone, a.dirAge AS address, c.codCam AS campaignId, c.nomCam AS campaign
        FROM agente a
        LEFT JOIN baseDatosAsesor ba ON ba.idAgeAse = a.idAge
        LEFT JOIN campana c ON c.codCam = ba.codCamAse
        ORDER BY a.nomAge`);
    return rows;
};

module.exports = { listAdvisors };
