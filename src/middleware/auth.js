const jwt = require('jsonwebtoken');

const obtenerSecreto = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
    if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    return process.env.JWT_SECRET;
};

const obtenerCookie = (encabezado, nombre) => encabezado?.split(';').map(parte => parte.trim()).find(parte => parte.startsWith(`${nombre}=`))?.slice(nombre.length + 1) || null;
const autenticar = (req, res, next) => {
    const encabezado = req.headers.authorization || '';
    const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : obtenerCookie(req.headers.cookie, 'contact_sena_session');
    if (!token) return res.status(401).json({ error: 'Token de sesión requerido' });
    try { req.auth = jwt.verify(token, obtenerSecreto()); next(); } catch { res.status(401).json({ error: 'Sesión inválida o expirada' }); }
};

const requerirRol = (...roles) => (req, res, next) => roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: 'No tienes permisos para este módulo' });
const firmarUsuario = usuario => jwt.sign({ id: usuario.id, role: usuario.role }, obtenerSecreto(), { expiresIn: '8h' });

module.exports = { autenticar, requerirRol, firmarUsuario };
