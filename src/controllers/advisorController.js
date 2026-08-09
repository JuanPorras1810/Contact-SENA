const { listAdvisors } = require('../models/advisorModel');

const getAdvisors = async (req, res) => res.json({ data: await listAdvisors() });

module.exports = { getAdvisors };
