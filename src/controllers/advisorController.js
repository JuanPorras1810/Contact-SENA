const { listarAsesores } = require('../models/advisorModel');

const obtenerAsesores = async (req, res) => res.json({ data: await listarAsesores() });

module.exports = { obtenerAsesores };
