const { pool } = require('../config/database');

const obtenerGeografiaModelo = async () => {
    const [departments] = await pool.query('SELECT idDep AS id, nomDep AS name FROM departamento ORDER BY nomDep');
    const [municipalities] = await pool.query('SELECT idMun AS id, idDepMun AS departmentId, nomMun AS name FROM municipio ORDER BY nomMun');
    const [neighborhoods] = await pool.query('SELECT idBar AS id, idMunBar AS municipalityId, nomBar AS name FROM barrio ORDER BY nomBar');
    return { departments, municipalities, neighborhoods };
};
const obtenerCatalogosOperativos = async () => {
    const [documentTypes] = await pool.query('SELECT idTipDoc AS id, nomTipDoc AS name FROM tipoDocumento ORDER BY idTipDoc');
    const [campaigns] = await pool.query('SELECT codCam AS id, nomCam AS name FROM campana ORDER BY nomCam');
    return { documentTypes, campaigns };
};

module.exports = { obtenerGeografiaModelo, obtenerCatalogosOperativos };
