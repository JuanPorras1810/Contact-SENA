const { obtenerDatosPanel } = require('../models/panelModel');

const obtenerPanel = async (req, res) => res.json(await obtenerDatosPanel());

module.exports = { obtenerPanel };
