const { listarClientes, crearClienteModelo, crearClientesMasivosModelo, actualizarClienteModelo, listarClientesAsignados } = require('../models/clientModel');
const { reequilibrarClientesPendientes } = require('../models/assignmentModel');
const { pool } = require('../config/database');

const separarCsv = (texto, delimitador = ',') => {
    const filas = []; let fila = []; let campo = ''; let comillas = false;
    for (let indice = 0; indice < texto.length; indice += 1) {
        const caracter = texto[indice];
        if (caracter === '"' && texto[indice + 1] === '"') { campo += '"'; indice += 1; }
        else if (caracter === '"') comillas = !comillas;
        else if (caracter === delimitador && !comillas) { fila.push(campo.trim()); campo = ''; }
        else if ((caracter === '\n' || caracter === '\r') && !comillas) { if (caracter === '\r' && texto[indice + 1] === '\n') indice += 1; fila.push(campo.trim()); if (fila.some(valor => valor)) filas.push(fila); fila = []; campo = ''; }
        else campo += caracter;
    }
    if (campo || fila.length) { fila.push(campo.trim()); if (fila.some(valor => valor)) filas.push(fila); }
    return filas;
};

const importarClientesCsv = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo CSV' });
    const texto = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const usaSeparadorExcel = /^sep=([,;])\s*(?:\r?\n|$)/i.exec(texto);
    const filas = separarCsv(usaSeparadorExcel ? texto.slice(usaSeparadorExcel[0].length) : texto, usaSeparadorExcel?.[1] || (texto.split(/\r?\n/, 1)[0].includes(';') ? ';' : ','));
    if (filas.length < 2) return res.status(400).json({ error: 'El CSV no contiene registros para importar' });
    const normalizarEncabezado = valor => valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encabezados = filas[0].map(normalizarEncabezado);
    const indice = nombre => encabezados.indexOf(normalizarEncabezado(nombre));
    const obtener = (fila, nombre) => { const posicion = indice(nombre); return posicion >= 0 ? fila[posicion] || '' : ''; };
    const errores = []; const clientes = [];
    for (let numeroFila = 1; numeroFila < filas.length; numeroFila += 1) {
        const fila = filas[numeroFila]; const campaignName = obtener(fila, 'campaña'); const phone = obtener(fila, 'telefono');
        if (!campaignName || !phone) { errores.push(`Fila ${numeroFila + 1}: campaña y teléfono son obligatorios.`); continue; }
        const [campaigns] = await pool.query('SELECT codCam FROM campana WHERE nomCam = ? LIMIT 1', [campaignName]);
        if (!campaigns.length) { errores.push(`Fila ${numeroFila + 1}: la campaña "${campaignName}" no existe.`); continue; }
        let documentTypeId = null; const documentTypeName = obtener(fila, 'tipo_documento');
        if (documentTypeName) { const [types] = await pool.query('SELECT idTipDoc FROM tipoDocumento WHERE nomTipDoc = ? LIMIT 1', [documentTypeName]); if (!types.length) { errores.push(`Fila ${numeroFila + 1}: el tipo de documento "${documentTypeName}" no existe.`); continue; } documentTypeId = types[0].idTipDoc; }
        const documentId = obtener(fila, 'numero_documento') || null;
        clientes.push({ campaignId: campaigns[0].codCam, documentTypeId, documentId, name: obtener(fila, 'nombre_completo') || null, email: obtener(fila, 'correo') || null, phone, phoneAlt: obtener(fila, 'telefono_alternativo') || null, address: obtener(fila, 'direccion') || null, observation: obtener(fila, 'observaciones') || null });
    }
    if (errores.length) return res.status(400).json({ error: 'El CSV contiene filas inválidas', errors: errores });
    const imported = clientes.length ? await crearClientesMasivosModelo(clientes) : 0; if (imported) await reequilibrarClientesPendientes();
    res.status(201).json({ data: { imported } });
};

const obtenerClientes = async (req, res) => res.json({ data: await listarClientes() });
const obtenerClientesAsignados = async (req, res) => { if (!req.query.agentId || String(req.query.agentId) !== String(req.auth.id)) return res.status(403).json({ error: 'Solo puedes consultar tus clientes asignados' }); res.json({ data: await listarClientesAsignados(req.query.agentId) }); };
const crearCliente = async (req, res) => {
    const required = ['campaignId', 'phone'];
    if (required.some(field => !req.body[field])) return res.status(400).json({ error: 'La campaña y el teléfono principal son obligatorios' });
    const data = await crearClienteModelo(req.body);
    await reequilibrarClientesPendientes();
    res.status(201).json({ data });
};

const actualizarCliente = async (req, res) => { const obligatorios = ['campaignId', 'phone']; if (obligatorios.some(campo => !req.body[campo])) return res.status(400).json({ error: 'Completa los campos obligatorios del cliente' }); res.json({ data: await actualizarClienteModelo(req.params.id, req.body) }); };

module.exports = { obtenerClientes, obtenerClientesAsignados, crearCliente, importarClientesCsv, actualizarCliente };
