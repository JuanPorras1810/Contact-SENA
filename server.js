require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { checkDatabase } = require('./src/config/database');
const { notFound, errorHandler } = require('./src/utils/http');
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

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Contact SENA API ejecutándose en http://localhost:${port}`));
