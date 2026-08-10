const intentos = new Map();

const limitarLogin = (req, res, next) => {
    const ahora = Date.now(); const clave = req.ip || req.socket.remoteAddress || 'unknown'; const actual = intentos.get(clave) || { inicio: ahora, cantidad: 0 };
    if (ahora - actual.inicio > 15 * 60 * 1000) { actual.inicio = ahora; actual.cantidad = 0; }
    actual.cantidad += 1; intentos.set(clave, actual);
    if (actual.cantidad > 10) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });
    next();
};

module.exports = { limitarLogin };
