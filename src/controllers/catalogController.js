const { getGeography } = require('../models/catalogModel');

const geography = async (req, res) => res.json(await getGeography());

module.exports = { geography };
