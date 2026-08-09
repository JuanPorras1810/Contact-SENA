const { findUser, updateProfile, getProfile } = require('../models/authModel');
const { startSession, closeSession } = require('../models/sessionModel');
const { assignPendingClients, reassignPendingClients } = require('../models/assignmentModel');
const { signUser } = require('../middleware/auth');

const login = async (req, res) => {
    const { id, password, role } = req.body;
    if (!id || !password || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario, contraseña y rol son obligatorios' });
    const user = await findUser(id, password, role);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    await startSession(role, id);
    if (role === 'agente') await assignPendingClients();
    const sessionUser = { ...user, role };
    res.json({ user: sessionUser, token: signUser(sessionUser) });
};

const logout = async (req, res) => {
    const { id, role } = req.body;
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'La sesión no coincide con el usuario' });
    if (!id || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario y rol son obligatorios' });
    await closeSession(role, id);
    if (role === 'agente') await reassignPendingClients(id);
    res.json({ message: 'Sesión cerrada correctamente' });
};

const profile = async (req, res) => {
    const { id, role } = req.query;
    if (!id || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario y rol son obligatorios' });
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'No puedes consultar otro perfil' });
    const user = await getProfile(role, id);
    if (!user) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json({ user: { ...user, role } });
};

const patchProfile = async (req, res) => {
    const { id, role, name, email, address, phone, phoneAlt, neighborhoodId, photo } = req.body;
    if (!id || !['supervisor', 'agente'].includes(role) || !name || !email || !address || !phone || !neighborhoodId) return res.status(400).json({ error: 'Completa todos los campos obligatorios del perfil' });
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'No puedes modificar otro perfil' });
    await updateProfile(role, { id, name, email, address, phone, phoneAlt, neighborhoodId, photo });
    res.json({ message: 'Datos actualizados correctamente' });
};

module.exports = { login, logout, profile, patchProfile };
