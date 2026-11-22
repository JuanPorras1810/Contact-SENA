const manejadorAsincrono = controlador => (req, res, next) => Promise.resolve(controlador(req, res, next)).catch(next);

const noEncontrado = (req, res) => res.status(404).json({ error: 'Recurso no encontrado' });

const manejadorErrores = (error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Error interno del servidor' });
};

module.exports = { manejadorAsincrono, noEncontrado, manejadorErrores };
