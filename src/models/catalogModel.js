const { pool } = require('../config/database');

const getGeography = async () => {
    const [departments] = await pool.query('SELECT idDep AS id, nomDep AS name FROM departamento ORDER BY nomDep');
    const [municipalities] = await pool.query('SELECT idMun AS id, idDepMun AS departmentId, nomMun AS name FROM municipio ORDER BY nomMun');
    const [neighborhoods] = await pool.query('SELECT idBar AS id, idMunBar AS municipalityId, nomBar AS name FROM barrio ORDER BY nomBar');
    return { departments, municipalities, neighborhoods };
};

module.exports = { getGeography };
