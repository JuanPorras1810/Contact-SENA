const { getPanelData } = require('../models/panelModel');

const getPanel = async (req, res) => res.json(await getPanelData());

module.exports = { getPanel };
