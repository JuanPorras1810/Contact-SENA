const formatearFecha = valor => {
    if (!valor) return null;
    const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor;
};

const formatearHora = valor => valor ? String(valor).slice(0, 5) : null;

module.exports = { formatearFecha, formatearHora };
