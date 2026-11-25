const { obtenerGeografiaModelo, obtenerCatalogosOperativos } = require('../models/catalogModel');

const obtenerGeografia = async (req, res) => res.json(await obtenerGeografiaModelo());
const obtenerOperativos = async (req, res) => res.json(await obtenerCatalogosOperativos());

module.exports = { obtenerGeografia, obtenerOperativos };
