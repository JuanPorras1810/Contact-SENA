require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { checkDatabase, ensureOperationalSchema } = require('./src/config/database');
const { noEncontrado, manejadorErrores } = require('./src/utils/http');
const authRoutes = require('./src/routes/authRoutes');
const timeRoutes = require('./src/routes/timeRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const campaignRoutes = require('./src/routes/campaignRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const indicatorRoutes = require('./src/routes/indicatorRoutes');
const advisorRoutes = require('./src/routes/advisorRoutes');
const panelRoutes = require('./src/routes/panelRoutes');
const catalogRoutes = require('./src/routes/catalogRoutes');
const interactionRoutes = require('./src/routes/interactionRoutes');
const { protegerCambios } = require('./src/middleware/csrf');

const app = express();
const port = Number(process.env.PORT || 3000);
app.set('trust proxy', 1);

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (req.path === '/' || req.path.toLowerCase().endsWith('.html')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});
if (process.env.FRONTEND_ORIGIN) app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(protegerCambios);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
    await checkDatabase();
    res.json({ ok: true, database: 'connected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tiempos', timeRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/campanas', campaignRoutes);
app.use('/api/historial', historyRoutes);
app.use('/api/indicadores', indicatorRoutes);
app.use('/api/asesores', advisorRoutes);
app.use('/api/panel', panelRoutes);
app.use('/api/catalogos', catalogRoutes);
app.use('/api/interacciones', interactionRoutes);
app.use(noEncontrado);
app.use(manejadorErrores);

(async () => {
    await checkDatabase();
    await ensureOperationalSchema();
    app.listen(port, () => console.log(`Contact SENA ejecutándose en http://localhost:${port}`));
})().catch(error => { console.error('No se pudo inicializar la base de datos:', error.message); process.exitCode = 1; });
