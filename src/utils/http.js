const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const notFound = (req, res) => res.status(404).json({ error: 'Recurso no encontrado' });

const errorHandler = (error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Error interno del servidor' });
};

module.exports = { asyncHandler, notFound, errorHandler };
