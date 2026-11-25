const metodosSeguros = new Set(['GET', 'HEAD', 'OPTIONS']);

const origenPermitido = (req, origen) => {
    if (!origen) return true;
    const origenes = [process.env.FRONTEND_ORIGIN, `${req.protocol}://${req.get('host')}`].filter(Boolean);
    return origenes.includes(origen);
};

const protegerCambios = (req, res, next) => {
    if (metodosSeguros.has(req.method) || !req.path.startsWith('/api/')) return next();
    if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Solicitud de origen no permitido' });
    if (!origenPermitido(req, req.headers.origin)) return res.status(403).json({ error: 'Origen no permitido' });
    next();
};

module.exports = { protegerCambios };
