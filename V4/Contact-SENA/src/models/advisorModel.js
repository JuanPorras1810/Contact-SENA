const { pool } = require('../config/database');

const listarAsesores = async () => {
    const [rows] = await pool.query(`
        SELECT a.idAge AS id, a.idTipDocAge AS documentTypeId, a.idBarAge AS neighborhoodId,
               b.idMunBar AS municipalityId, m.idDepMun AS departmentId, a.nomAge AS name,
               a.emaAge AS email, a.telAge AS phone, a.dirAge AS address, a.fotAge AS photo,
               ba.conAse AS assignmentId,
               c.codCam AS campaignId, c.nomCam AS campaign
        FROM agente a
        LEFT JOIN barrio b ON b.idBar = a.idBarAge
        LEFT JOIN municipio m ON m.idMun = b.idMunBar
        LEFT JOIN baseDatosAsesor ba ON ba.idAgeAse = a.idAge
        LEFT JOIN campana c ON c.codCam = ba.codCamAse
        ORDER BY CAST(a.idAge AS UNSIGNED) DESC, a.idAge DESC, ba.conAse IS NULL, ba.conAse`);
    return rows;
};

module.exports = { listarAsesores };
