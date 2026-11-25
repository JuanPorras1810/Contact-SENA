const { pool } = require('../config/database');

const crearAgenteModelo = async agente => {
    await pool.query(`INSERT INTO agente
        (idAge, idTipDocAge, idBarAge, nomAge, emaAge, dirAge, telAge, telAltAge, conAge, fotAge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        agente.id, agente.documentTypeId, agente.neighborhoodId, agente.name, agente.email,
        agente.address, agente.phone, agente.phoneAlt || null, agente.password, agente.photo || null
    ]);
    return agente;
};
const actualizarAgenteModelo = async (id, agente) => {
    const campos = []; const valores = [];
    const columnas = { documentTypeId: 'idTipDocAge', neighborhoodId: 'idBarAge', name: 'nomAge', email: 'emaAge', address: 'dirAge', phone: 'telAge', phoneAlt: 'telAltAge', photo: 'fotAge' };
    Object.entries(columnas).forEach(([clave, columna]) => { if (agente[clave] !== undefined && agente[clave] !== '') { campos.push(`${columna} = ?`); valores.push(agente[clave] || null); } });
    if (agente.password) { campos.push('conAge = ?'); valores.push(agente.password); }
    if (campos.length) { valores.push(id); await pool.query(`UPDATE agente SET ${campos.join(', ')} WHERE idAge = ?`, valores); }
    return { id, ...agente };
};

module.exports = { crearAgenteModelo, actualizarAgenteModelo };
