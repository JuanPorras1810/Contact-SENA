const { pool } = require('../config/database');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const hashPassword = async password => { const salt = crypto.randomBytes(16).toString('hex'); const derived = await scrypt(password, salt, 64); return `scrypt$${salt}$${derived.toString('hex')}`; };
const verifyPassword = async (password, stored) => {
    if (!stored?.startsWith('scrypt$')) return stored === password;
    const [, salt, expected] = stored.split('$'); const derived = await scrypt(password, salt, 64); const expectedBuffer = Buffer.from(expected, 'hex'); return expectedBuffer.length === derived.length && crypto.timingSafeEqual(expectedBuffer, derived);
};

const buscarUsuario = async (id, password, rol) => {
    const table = rol === 'supervisor' ? 'supervisor' : 'agente';
    const idColumn = rol === 'supervisor' ? 'idSup' : 'idAge';
    const nameColumn = rol === 'supervisor' ? 'nomSup' : 'nomAge';
    const emailColumn = rol === 'supervisor' ? 'emaSup' : 'emaAge';
    const passwordColumn = rol === 'supervisor' ? 'conSup' : 'conAge';
    const documentColumn = rol === 'supervisor' ? 'idTipDocSup' : 'idTipDocAge';
    const neighborhoodColumn = rol === 'supervisor' ? 'idBarSup' : 'idBarAge';
    const addressColumn = rol === 'supervisor' ? 'dirSup' : 'dirAge';
    const phoneColumn = rol === 'supervisor' ? 'telSup' : 'telAge';
    const alternatePhoneColumn = rol === 'supervisor' ? 'telAltSup' : 'telAltAge';
    const photoColumn = rol === 'supervisor' ? 'fotSup' : 'fotAge';
    const [rows] = await pool.query(
        `SELECT ${idColumn} AS id, ${documentColumn} AS documentTypeId, ${neighborhoodColumn} AS neighborhoodId,
                ${nameColumn} AS name, ${emailColumn} AS email, ${addressColumn} AS address,
                ${phoneColumn} AS phone, ${alternatePhoneColumn} AS phoneAlt, ${photoColumn} AS photo,
                b.idMunBar AS municipalityId, m.idDepMun AS departmentId, ${passwordColumn} AS password
         FROM ${table}
         INNER JOIN barrio b ON b.idBar = ${table}.${neighborhoodColumn}
         INNER JOIN municipio m ON m.idMun = b.idMunBar
         WHERE ${idColumn} = ? LIMIT 1`,
        [id]
    );
    const usuario = rows[0];
    if (!usuario || !(await verifyPassword(password, usuario.password))) return null;
    if (!usuario.password.startsWith('scrypt$')) await pool.query(`UPDATE ${table} SET ${passwordColumn} = ? WHERE ${idColumn} = ?`, [await hashPassword(password), id]);
    delete usuario.password;
    return usuario;
};

const actualizarPerfilModelo = async (rol, perfil) => {
    const esSupervisor = rol === 'supervisor';
    const table = esSupervisor ? 'supervisor' : 'agente';
    const idColumn = esSupervisor ? 'idSup' : 'idAge';
    const fields = esSupervisor ? {
        name: 'nomSup', email: 'emaSup', address: 'dirSup', phone: 'telSup', phoneAlt: 'telAltSup', neighborhoodId: 'idBarSup', photo: 'fotSup'
    } : {
        name: 'nomAge', email: 'emaAge', address: 'dirAge', phone: 'telAge', phoneAlt: 'telAltAge', neighborhoodId: 'idBarAge', photo: 'fotAge'
    };
    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([key, column]) => { if (perfil[key] !== undefined) { updates.push(`${column} = ?`); values.push(perfil[key] || null); } });
    if (!updates.length) return;
    values.push(perfil.id);
    await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE ${idColumn} = ?`, values);
};

const obtenerPerfilModelo = async (rol, id) => {
    const esSupervisor = rol === 'supervisor';
    const table = esSupervisor ? 'supervisor' : 'agente';
    const idColumn = esSupervisor ? 'idSup' : 'idAge';
    const documentColumn = esSupervisor ? 'idTipDocSup' : 'idTipDocAge';
    const neighborhoodColumn = esSupervisor ? 'idBarSup' : 'idBarAge';
    const fields = esSupervisor ? ['nomSup AS name', 'emaSup AS email', 'dirSup AS address', 'telSup AS phone', 'telAltSup AS phoneAlt', 'fotSup AS photo'] : ['nomAge AS name', 'emaAge AS email', 'dirAge AS address', 'telAge AS phone', 'telAltAge AS phoneAlt', 'fotAge AS photo'];
    const [rows] = await pool.query(`SELECT ${idColumn} AS id, ${documentColumn} AS documentTypeId, ${neighborhoodColumn} AS neighborhoodId, b.idMunBar AS municipalityId, m.idDepMun AS departmentId, ${fields.join(', ')} FROM ${table} INNER JOIN barrio b ON b.idBar = ${table}.${neighborhoodColumn} INNER JOIN municipio m ON m.idMun = b.idMunBar WHERE ${idColumn} = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

module.exports = { buscarUsuario, actualizarPerfilModelo, obtenerPerfilModelo };
