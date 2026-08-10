const { buscarUsuario, actualizarPerfilModelo, obtenerPerfilModelo } = require('../models/authModel');
const { iniciarSesionModelo, cerrarSesionModelo } = require('../models/sessionModel');
const { asignarClientesPendientes, reasignarClientesPendientes } = require('../models/assignmentModel');
const { firmarUsuario } = require('../middleware/auth');
const cookieSegura = token => `contact_sena_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

const iniciarSesion = async (req, res) => {
    const { id, password, role } = req.body;
    if (!id || !password || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario, contraseña y rol son obligatorios' });
    const usuario = await buscarUsuario(id, password, role);
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });
    await iniciarSesionModelo(role, id);
    if (role === 'agente') await asignarClientesPendientes();
    const usuarioSesion = { ...usuario, role };
    res.setHeader('Set-Cookie', cookieSegura(firmarUsuario(usuarioSesion)));
    res.json({ user: usuarioSesion });
};

const cerrarSesion = async (req, res) => {
    const { id, role } = req.body;
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'La sesión no coincide con el usuario' });
    if (!id || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario y rol son obligatorios' });
    await cerrarSesionModelo(role, id);
    if (role === 'agente') await reasignarClientesPendientes(id);
    res.setHeader('Set-Cookie', 'contact_sena_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
    res.json({ message: 'Sesión cerrada correctamente' });
};

const obtenerPerfil = async (req, res) => {
    const { id, role } = req.query;
    if (!id || !['supervisor', 'agente'].includes(role)) return res.status(400).json({ error: 'Usuario y rol son obligatorios' });
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'No puedes consultar otro perfil' });
    const usuario = await obtenerPerfilModelo(role, id);
    if (!usuario) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json({ user: { ...usuario, role } });
};
const obtenerSesion = async (req, res) => {
    const usuario = await obtenerPerfilModelo(req.auth.role, req.auth.id);
    if (!usuario) return res.status(404).json({ error: 'Sesión no válida' });
    res.json({ user: { ...usuario, role: req.auth.role } });
};

const actualizarPerfil = async (req, res) => {
    const { id, role, name, email, address, phone, phoneAlt, neighborhoodId, photo } = req.body;
    if (!id || !['supervisor', 'agente'].includes(role) || !name || !email || !address || !phone || !neighborhoodId) return res.status(400).json({ error: 'Completa todos los campos obligatorios del perfil' });
    if (req.auth && (String(req.auth.id) !== String(id) || req.auth.role !== role)) return res.status(403).json({ error: 'No puedes modificar otro perfil' });
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.'-]{2,60}$/.test(name.trim())) return res.status(400).json({ error: 'El nombre solo debe contener letras y espacios' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Escribe un correo electrónico válido' });
    if (!/^\d{7,10}$/.test(String(phone).trim()) || (phoneAlt && !/^\d{7,10}$/.test(String(phoneAlt).trim()))) return res.status(400).json({ error: 'Los teléfonos solo deben contener entre 7 y 10 números' });
    await actualizarPerfilModelo(role, { id, name, email, address, phone, phoneAlt, neighborhoodId, photo });
    res.json({ message: 'Datos actualizados correctamente' });
};

module.exports = { iniciarSesion, cerrarSesion, obtenerPerfil, obtenerSesion, actualizarPerfil };
