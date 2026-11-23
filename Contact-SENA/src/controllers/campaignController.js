const { listarCampanas, listarTipificaciones, crearCampanaModelo, actualizarCampanaModelo } = require('../models/campaignModel');

const obtenerCampanas = async (req, res) => res.json({ data: await listarCampanas() });
const obtenerTipificaciones = async (req, res) => res.json({ data: await listarTipificaciones(req.params.id) });
const crearCampana = async (req, res) => {
    if (!req.body.name || !req.body.startDate || !req.body.endDate) return res.status(400).json({ error: 'Nombre, fecha inicial y fecha final son obligatorios' });
    const fileUrl = req.file ? `/uploads/campaigns/${req.file.filename}` : null;
    let typifications = [];
    try { typifications = JSON.parse(req.body.typifications || '[]').map(value => String(value).trim()).filter(Boolean); } catch { return res.status(400).json({ error: 'Las tipificaciones no tienen un formato válido' }); }
    res.status(201).json({ data: await crearCampanaModelo({ ...req.body, fileUrl, typifications }) });
};
const actualizarCampana = async (req, res) => {
    if (!req.body.name || !req.body.startDate || !req.body.endDate) return res.status(400).json({ error: 'Nombre, fecha inicial y fecha final son obligatorios' });
    let typifications = null;
    try { typifications = req.body.typifications === undefined ? null : JSON.parse(req.body.typifications || '[]').map(value => String(value).trim()).filter(Boolean); } catch { return res.status(400).json({ error: 'Las tipificaciones no tienen un formato válido' }); }
    const fileUrl = req.file ? `/uploads/campaigns/${req.file.filename}` : undefined;
    res.json({ data: await actualizarCampanaModelo(req.params.id, { ...req.body, fileUrl, typifications }) });
};

module.exports = { obtenerCampanas, obtenerTipificaciones, crearCampana, actualizarCampana };
