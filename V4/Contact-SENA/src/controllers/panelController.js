const { obtenerDatosPanel, obtenerTrazabilidadCaso } = require('../models/panelModel');

const obtenerPanel = async (req, res) => res.json(await obtenerDatosPanel());
const obtenerTrazabilidad = async (req, res) => res.json({ data: await obtenerTrazabilidadCaso(req.params.id) });

module.exports = { obtenerPanel, obtenerTrazabilidad };
