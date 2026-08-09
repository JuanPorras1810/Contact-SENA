const { pool } = require('../config/database');

const listCampaigns = async () => {
    const [rows] = await pool.query(`
        SELECT ca.codCam AS id, ca.nomCam AS name, ca.fecIniCam AS startDate,
               ca.fecFinCam AS endDate, ca.proCam AS fileUrl,
               COUNT(t.codTip) AS typificationCount
        FROM campana ca
        LEFT JOIN tipificacion t ON t.codCamTip = ca.codCam
        GROUP BY ca.codCam ORDER BY ca.fecIniCam DESC`);
    return rows;
};

const listTypifications = async campaignId => {
    const [rows] = await pool.query('SELECT codTip AS id, nomTip AS name FROM tipificacion WHERE codCamTip = ? ORDER BY codTip', [campaignId]);
    return rows;
};

const createCampaign = async campaign => {
    const [result] = await pool.query('INSERT INTO campana (nomCam, fecIniCam, fecFinCam, proCam) VALUES (?, ?, ?, ?)', [campaign.name, campaign.startDate, campaign.endDate, campaign.fileUrl || null]);
    return { id: result.insertId, ...campaign };
};

module.exports = { listCampaigns, listTypifications, createCampaign };
