const { pool } = require('../config/database');

const findUser = async (id, password, role) => {
    const table = role === 'supervisor' ? 'supervisor' : 'agente';
    const idColumn = role === 'supervisor' ? 'idSup' : 'idAge';
    const nameColumn = role === 'supervisor' ? 'nomSup' : 'nomAge';
    const emailColumn = role === 'supervisor' ? 'emaSup' : 'emaAge';
    const passwordColumn = role === 'supervisor' ? 'conSup' : 'conAge';
    const documentColumn = role === 'supervisor' ? 'idTipDocSup' : 'idTipDocAge';
    const neighborhoodColumn = role === 'supervisor' ? 'idBarSup' : 'idBarAge';
    const addressColumn = role === 'supervisor' ? 'dirSup' : 'dirAge';
    const phoneColumn = role === 'supervisor' ? 'telSup' : 'telAge';
    const alternatePhoneColumn = role === 'supervisor' ? 'telAltSup' : 'telAltAge';
    const photoColumn = role === 'supervisor' ? 'fotSup' : 'fotAge';
    const [rows] = await pool.query(
        `SELECT ${idColumn} AS id, ${documentColumn} AS documentTypeId, ${neighborhoodColumn} AS neighborhoodId,
                ${nameColumn} AS name, ${emailColumn} AS email, ${addressColumn} AS address,
                ${phoneColumn} AS phone, ${alternatePhoneColumn} AS phoneAlt, ${photoColumn} AS photo,
                b.idMunBar AS municipalityId, m.idDepMun AS departmentId
         FROM ${table}
         INNER JOIN barrio b ON b.idBar = ${table}.${neighborhoodColumn}
         INNER JOIN municipio m ON m.idMun = b.idMunBar
         WHERE ${idColumn} = ? AND ${passwordColumn} = ? LIMIT 1`,
        [id, password]
    );
    return rows[0] || null;
};

const updateProfile = async (role, profile) => {
    const isSupervisor = role === 'supervisor';
    const table = isSupervisor ? 'supervisor' : 'agente';
    const idColumn = isSupervisor ? 'idSup' : 'idAge';
    const fields = isSupervisor ? {
        name: 'nomSup', email: 'emaSup', address: 'dirSup', phone: 'telSup', phoneAlt: 'telAltSup', neighborhoodId: 'idBarSup', photo: 'fotSup'
    } : {
        name: 'nomAge', email: 'emaAge', address: 'dirAge', phone: 'telAge', phoneAlt: 'telAltAge', neighborhoodId: 'idBarAge', photo: 'fotAge'
    };
    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([key, column]) => { if (profile[key] !== undefined) { updates.push(`${column} = ?`); values.push(profile[key] || null); } });
    if (!updates.length) return;
    values.push(profile.id);
    await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE ${idColumn} = ?`, values);
};

const getProfile = async (role, id) => {
    const isSupervisor = role === 'supervisor';
    const table = isSupervisor ? 'supervisor' : 'agente';
    const idColumn = isSupervisor ? 'idSup' : 'idAge';
    const documentColumn = isSupervisor ? 'idTipDocSup' : 'idTipDocAge';
    const neighborhoodColumn = isSupervisor ? 'idBarSup' : 'idBarAge';
    const fields = isSupervisor ? ['nomSup AS name', 'emaSup AS email', 'dirSup AS address', 'telSup AS phone', 'telAltSup AS phoneAlt', 'fotSup AS photo'] : ['nomAge AS name', 'emaAge AS email', 'dirAge AS address', 'telAge AS phone', 'telAltAge AS phoneAlt', 'fotAge AS photo'];
    const [rows] = await pool.query(`SELECT ${idColumn} AS id, ${documentColumn} AS documentTypeId, ${neighborhoodColumn} AS neighborhoodId, b.idMunBar AS municipalityId, m.idDepMun AS departmentId, ${fields.join(', ')} FROM ${table} INNER JOIN barrio b ON b.idBar = ${table}.${neighborhoodColumn} INNER JOIN municipio m ON m.idMun = b.idMunBar WHERE ${idColumn} = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

module.exports = { findUser, updateProfile, getProfile };
