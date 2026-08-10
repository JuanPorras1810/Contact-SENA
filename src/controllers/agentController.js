const { crearAgenteModelo, actualizarAgenteModelo } = require('../models/agentModel');

const crearAgente = async (req, res) => {
    const obligatorios = ['id', 'documentTypeId', 'neighborhoodId', 'name', 'email', 'address', 'phone', 'password'];
    if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa todos los campos obligatorios del agente' });
    res.status(201).json({ data: await crearAgenteModelo(req.body) });
};
const actualizarAgente = async (req, res) => { const obligatorios = ['name', 'email', 'address', 'phone']; if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa todos los campos obligatorios del agente' }); res.json({ data: await actualizarAgenteModelo(req.params.id, req.body) }); };

module.exports = { crearAgente, actualizarAgente };
