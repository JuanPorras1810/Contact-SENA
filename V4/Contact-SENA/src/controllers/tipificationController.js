const {
    listarTipificaciones,
    listarEstadosCaso,
    crearTipificacion,
    actualizarTipificacion,
    eliminarTipificacion
} = require('../models/tipificationModel');

const validarDatos = (body, parcial = false) => {
    const name = body.name === undefined && parcial ? undefined : String(body.name || '').trim();
    const statusId = body.statusId === undefined && parcial ? undefined : Number(body.statusId);
    if (!parcial && (!name || !Number.isInteger(statusId) || statusId <= 0)) return { error: 'Nombre y estado de caso son obligatorios' };
    if (parcial && ((name !== undefined && !name) || (statusId !== undefined && (!Number.isInteger(statusId) || statusId <= 0)))) return { error: 'Los datos de la tipificación no son válidos' };
    return { data: { ...(name === undefined ? {} : { name }), ...(statusId === undefined ? {} : { statusId }) } };
};

const obtenerTipificaciones = async (req, res) => res.json({ data: await listarTipificaciones() });
const obtenerEstadosCaso = async (req, res) => res.json({ data: await listarEstadosCaso() });
const crear = async (req, res) => {
    const validacion = validarDatos(req.body);
    if (validacion.error) return res.status(400).json(validacion);
    res.status(201).json({ data: await crearTipificacion(validacion.data) });
};
const actualizar = async (req, res) => {
    const validacion = validarDatos(req.body);
    if (validacion.error) return res.status(400).json(validacion);
    res.json({ data: await actualizarTipificacion(req.params.id, validacion.data) });
};
const eliminar = async (req, res) => {
    await eliminarTipificacion(req.params.id);
    res.json({ data: { id: Number(req.params.id) } });
};

module.exports = { obtenerTipificaciones, obtenerEstadosCaso, crear, actualizar, eliminar };
