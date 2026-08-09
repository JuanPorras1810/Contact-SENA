const jwt = require('jsonwebtoken');

const secret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
    return process.env.JWT_SECRET;
};

const authenticate = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token de sesión requerido' });
    try { req.auth = jwt.verify(token, secret()); next(); } catch { res.status(401).json({ error: 'Sesión inválida o expirada' }); }
};

const requireRole = role => (req, res, next) => req.auth?.role === role ? next() : res.status(403).json({ error: 'No tienes permisos para este módulo' });
const signUser = user => jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: '8h' });

module.exports = { authenticate, requireRole, signUser };
