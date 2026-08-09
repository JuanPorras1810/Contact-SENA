const { getIndicators } = require('../models/indicatorModel');

const getIndicatorData = async (req, res) => res.json({ data: await getIndicators(req.query) });

module.exports = { getIndicatorData };
