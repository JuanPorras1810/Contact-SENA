const { pool } = require('../config/database');

const createAgent = async agent => {
    await pool.query(`INSERT INTO agente
        (idAge, idTipDocAge, idBarAge, nomAge, emaAge, dirAge, telAge, telAltAge, conAge, fotAge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        agent.id, agent.documentTypeId, agent.neighborhoodId, agent.name, agent.email,
        agent.address, agent.phone, agent.phoneAlt || null, agent.password, agent.photo || null
    ]);
    return agent;
};

module.exports = { createAgent };
