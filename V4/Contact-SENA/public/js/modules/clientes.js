document.addEventListener('DOMContentLoaded', () => {
    const filas = document.getElementById('clients-rows'); const formulario = document.getElementById('nuevo-cliente-form'); const modalNuevo = document.getElementById('modal-nuevo-cliente'); const modalCsv = document.getElementById('modal-carga-csv'); const busqueda = document.getElementById('client-search-input'); const criterioBusqueda = document.getElementById('client-search-type'); const limpiarBusqueda = document.getElementById('client-search-clear'); const sugerencias = document.getElementById('client-search-suggestions'); const controlBusqueda = document.querySelector('.client-search-control'); let clientes = []; let idEdicion = null; let geografia = null; let cargaCatalogos = Promise.resolve(); let seleccionBusqueda = null;
    if (!filas) return;
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const establecerOpciones = (selector, elementos, marcador = 'Seleccione...') => { if (!selector) return; selector.replaceChildren(new Option(marcador, '')); (elementos || []).forEach(elemento => selector.appendChild(new Option(elemento.name, elemento.id))); };
    const normalizarBusqueda = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    const campanaSelect = document.getElementById('cliente-campana');
    const campanaBusqueda = document.getElementById('cliente-campana-search');
    const campanaSugerencias = document.getElementById('cliente-campana-sugerencias');
    const campanaPicker = document.getElementById('client-campaign-picker');
    const cerrarSugerenciasCampana = () => {
        if (campanaSugerencias) campanaSugerencias.hidden = true;
        campanaBusqueda?.setAttribute('aria-expanded', 'false');
    };
    const mostrarSugerenciasCampana = () => {
        if (!campanaSelect || !campanaBusqueda || !campanaSugerencias) return;
        const termino = normalizarBusqueda(campanaBusqueda.value);
        const opciones = [...campanaSelect.options]
            .filter(opcion => opcion.value && (!termino || normalizarBusqueda(`${opcion.value} ${opcion.textContent}`).includes(termino)))
            .slice(0, 8);
        campanaSugerencias.replaceChildren();
        opciones.forEach(opcionCampana => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'client-campaign-suggestion';
            opcion.setAttribute('role', 'option');
            opcion.textContent = `${opcionCampana.value} - ${opcionCampana.textContent.trim()}`;
            opcion.addEventListener('mousedown', event => event.preventDefault());
            opcion.addEventListener('click', () => {
                campanaSelect.value = opcionCampana.value;
                campanaBusqueda.value = opcion.textContent;
                cerrarSugerenciasCampana();
            });
            campanaSugerencias.appendChild(opcion);
        });
        if (!opciones.length && termino) {
            const vacio = document.createElement('div');
            vacio.className = 'client-campaign-no-results';
            vacio.textContent = 'Sin coincidencias...';
            campanaSugerencias.appendChild(vacio);
        }
        campanaSugerencias.hidden = !campanaSugerencias.children.length;
        campanaBusqueda.setAttribute('aria-expanded', String(!campanaSugerencias.hidden));
    };
    const renderizar = () => {
        const terminoOriginal = (busqueda?.value || '').trim().replace(/^#(?=\d)/, '');
        const termino = normalizarBusqueda(terminoOriginal);
        const criterio = criterioBusqueda?.value || 'all';
        const numerico = /^\d+$/.test(termino);
        filas.replaceChildren();
        const visibles = clientes.filter(cliente => {
            if (!termino) return true;
            if (seleccionBusqueda) {
                return seleccionBusqueda.tipo === 'campaign'
                    ? String(cliente.campaignId ?? '') === seleccionBusqueda.id
                    : String(cliente.id ?? '') === seleccionBusqueda.id;
            }
            return criterio === 'campaign'
                ? (numerico ? String(cliente.campaignId ?? '') === termino : normalizarBusqueda(cliente.campaign).includes(termino))
                : (numerico ? String(cliente.id ?? '') === termino : normalizarBusqueda(cliente.name).includes(termino));
        });
        visibles.forEach(cliente => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong class="cod-blue">#${escaparHtml(cliente.id)}</strong></td><td><span class="col-campana">${escaparHtml(cliente.campaign)}</span></td><td>${escaparHtml(cliente.phone)}<div class="phone-subtext">${cliente.phoneAlt ? `OPCIONAL: ${escaparHtml(cliente.phoneAlt)}` : ''}</div></td><td><strong>${escaparHtml(cliente.name)}</strong></td><td>${escaparHtml(cliente.email)}</td><td>${escaparHtml(cliente.address)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar contacto">✎</button></td>`;
            fila.querySelector('button').addEventListener('click', () => abrirEditor(cliente));
            filas.appendChild(fila);
        });
        const contador = document.getElementById('clients-count');
        if (contador) contador.textContent = `${visibles.length} ${visibles.length === 1 ? 'contacto' : 'contactos'}`;
        if (!filas.children.length) filas.innerHTML = '<tr><td colspan="7" class="empty-table-state">No hay contactos que coincidan con la búsqueda.</td></tr>';
    };
    const ocultarSugerencias = () => {
        if (sugerencias) sugerencias.hidden = true;
        busqueda?.setAttribute('aria-expanded', 'false');
    };
    const mostrarSugerencias = () => {
        if (!sugerencias || !busqueda) return;
        const tipo = criterioBusqueda?.value || 'client';
        const termino = normalizarBusqueda(busqueda.value.replace(/^#(?=\d)/, ''));
        const opciones = new Map();
        clientes.forEach(cliente => {
            const id = String(tipo === 'campaign' ? cliente.campaignId ?? '' : cliente.id ?? '');
            const nombre = String(tipo === 'campaign' ? cliente.campaign ?? '' : cliente.name ?? '');
            if (!id || (termino && !normalizarBusqueda(`${id} ${nombre}`).includes(termino))) return;
            if (!opciones.has(id)) {
                opciones.set(id, {
                    id,
                    etiqueta: tipo === 'campaign' ? `Campaña #${id} - ${nombre}` : `Contacto #${id} - ${nombre}`
                });
            }
        });
        sugerencias.replaceChildren();
        opciones.forEach(opcion => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'client-search-suggestion';
            boton.setAttribute('role', 'option');
            boton.textContent = opcion.etiqueta;
            boton.addEventListener('click', () => {
                seleccionBusqueda = { tipo, id: opcion.id };
                busqueda.value = opcion.etiqueta;
                actualizarLimpiarBusqueda();
                ocultarSugerencias();
                renderizar();
            });
            sugerencias.appendChild(boton);
        });
        if (!sugerencias.children.length && termino) {
            const vacio = document.createElement('div');
            vacio.className = 'client-search-suggestion client-search-no-results';
            vacio.textContent = 'Sin coincidencias...';
            sugerencias.appendChild(vacio);
        }
        sugerencias.hidden = !sugerencias.children.length;
        busqueda.setAttribute('aria-expanded', String(!sugerencias.hidden));
    };
    const cargar = async () => { try { const respuesta = await fetch('/api/clientes'); if (!respuesta.ok) throw new Error('No se pudieron cargar los contactos'); const datosRespuesta = await respuesta.json(); clientes = datosRespuesta.data || []; renderizar(); } catch (error) { filas.innerHTML = `<tr><td colspan="6">${escaparHtml(error.message)}</td></tr>`; } };
    const cargarCatalogos = async () => { const [respuestaGeografia, respuestaCatalogos] = await Promise.all([fetch('/api/catalogos/geografia'), fetch('/api/catalogos/operativos')]); geografia = await respuestaGeografia.json(); const catalogos = await respuestaCatalogos.json(); establecerOpciones(campanaSelect, catalogos.campaigns); establecerOpciones(document.getElementById('cliente-tipo-documento'), catalogos.documentTypes); establecerOpciones(document.getElementById('cliente-departamento'), geografia.departments); establecerOpciones(document.getElementById('cliente-municipio'), []); establecerOpciones(document.getElementById('cliente-barrio'), []); document.getElementById('cliente-departamento')?.addEventListener('change', () => { const elementos = geografia.municipalities.filter(elemento => String(elemento.departmentId) === document.getElementById('cliente-departamento').value); establecerOpciones(document.getElementById('cliente-municipio'), elementos); establecerOpciones(document.getElementById('cliente-barrio'), []); }); document.getElementById('cliente-municipio')?.addEventListener('change', () => establecerOpciones(document.getElementById('cliente-barrio'), geografia.neighborhoods.filter(elemento => String(elemento.municipalityId) === document.getElementById('cliente-municipio').value))); };
    const abrirEditor = async contacto => {
        await cargaCatalogos;
        idEdicion = contacto.id;
        modalNuevo.hidden = false;
        document.body.classList.add('modal-open');
        if (campanaSelect) {
            campanaSelect.value = String(contacto.campaignId || '');
            campanaSelect.disabled = true;
        }
        if (campanaBusqueda) {
            const opcion = campanaSelect?.selectedOptions[0];
            campanaBusqueda.value = opcion?.value ? `${opcion.value} - ${opcion.textContent.trim()}` : contacto.campaign || '';
            campanaBusqueda.disabled = true;
        }
        const tipoDocumento = document.getElementById('cliente-tipo-documento');
        if (tipoDocumento) tipoDocumento.value = String(contacto.documentTypeId || '');
        const departamento = document.getElementById('cliente-departamento');
        const municipio = document.getElementById('cliente-municipio');
        const barrio = document.getElementById('cliente-barrio');
        if (departamento) departamento.value = String(contacto.departmentId || '');
        establecerOpciones(municipio, (geografia?.municipalities || []).filter(item => String(item.departmentId) === String(contacto.departmentId || '')));
        if (municipio) municipio.value = String(contacto.municipalityId || '');
        establecerOpciones(barrio, (geografia?.neighborhoods || []).filter(item => String(item.municipalityId) === String(contacto.municipalityId || '')));
        if (barrio) barrio.value = String(contacto.neighborhoodId || '');
        Object.entries({ 'cliente-documento': contacto.documentId, 'cliente-nombre': contacto.name, 'cliente-correo': contacto.email, 'cliente-telefono': contacto.phone, 'cliente-telefono-alt': contacto.phoneAlt, 'cliente-direccion': contacto.address, 'cliente-observaciones': contacto.observation }).forEach(([id, valor]) => { const elemento = document.getElementById(id); if (elemento) elemento.value = valor || ''; });
    };
    const cerrar = () => { modalNuevo.hidden = true; modalCsv.hidden = true; document.body.classList.remove('modal-open'); cerrarSugerenciasCampana(); };
    const actualizarLimpiarBusqueda = () => { if (limpiarBusqueda) limpiarBusqueda.hidden = !busqueda?.value; };
    document.getElementById('btn-nuevo-cliente')?.addEventListener('click', () => { idEdicion = null; formulario?.reset(); if (campanaSelect) { campanaSelect.disabled = false; campanaSelect.value = ''; } if (campanaBusqueda) { campanaBusqueda.disabled = false; campanaBusqueda.value = ''; } cerrarSugerenciasCampana(); modalNuevo.hidden = false; document.body.classList.add('modal-open'); }); document.getElementById('btn-carga-csv')?.addEventListener('click', () => { modalCsv.hidden = false; document.body.classList.add('modal-open'); }); document.querySelectorAll('[data-close-client-modal]').forEach(boton => boton.addEventListener('click', cerrar));
    campanaBusqueda?.addEventListener('focus', mostrarSugerenciasCampana);
    campanaBusqueda?.addEventListener('input', () => { if (campanaSelect) campanaSelect.value = ''; mostrarSugerenciasCampana(); });
    campanaBusqueda?.addEventListener('keydown', event => { if (event.key === 'Escape') cerrarSugerenciasCampana(); });
    document.addEventListener('click', event => { if (campanaPicker && !campanaPicker.contains(event.target)) cerrarSugerenciasCampana(); });
    busqueda?.addEventListener('focus', mostrarSugerencias);
    busqueda?.addEventListener('input', () => { seleccionBusqueda = null; actualizarLimpiarBusqueda(); renderizar(); mostrarSugerencias(); });
    criterioBusqueda?.addEventListener('change', () => { seleccionBusqueda = null; if (busqueda) { busqueda.value = ''; busqueda.placeholder = criterioBusqueda.value === 'campaign' ? 'Buscar campaña por código o nombre...' : 'Buscar contacto por # o nombre...'; } actualizarLimpiarBusqueda(); renderizar(); busqueda?.focus(); mostrarSugerencias(); });
    limpiarBusqueda?.addEventListener('click', () => { seleccionBusqueda = null; if (busqueda) { busqueda.value = ''; busqueda.focus(); } actualizarLimpiarBusqueda(); renderizar(); ocultarSugerencias(); });
    document.addEventListener('click', evento => { if (controlBusqueda && !controlBusqueda.contains(evento.target)) ocultarSugerencias(); });
    formulario?.addEventListener('submit', async evento => { evento.preventDefault(); if (!campanaSelect?.value) { alert('Selecciona una campaña de la lista.'); campanaBusqueda?.focus(); mostrarSugerenciasCampana(); return; } const cuerpo = { documentTypeId: document.getElementById('cliente-tipo-documento').value, campaignId: campanaSelect.value, neighborhoodId: document.getElementById('cliente-barrio').value, documentId: document.getElementById('cliente-documento').value.trim(), name: document.getElementById('cliente-nombre').value.trim(), email: document.getElementById('cliente-correo').value.trim(), phone: document.getElementById('cliente-telefono').value.trim(), phoneAlt: document.getElementById('cliente-telefono-alt').value.trim(), address: document.getElementById('cliente-direccion').value.trim(), observation: document.getElementById('cliente-observaciones').value.trim() }; try { const respuesta = await fetch(idEdicion ? `/api/clientes/${idEdicion}` : '/api/clientes', { method: idEdicion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); const datosRespuesta = await respuesta.json(); if (!respuesta.ok) throw new Error(datosRespuesta.error || 'No se pudo guardar el contacto'); cerrar(); await cargar(); } catch (error) { alert(error.message); } });
    document.querySelectorAll('[data-download-csv-template]').forEach(enlace => enlace.addEventListener('click', async event => { event.preventDefault(); const respuesta = await fetch('/templates/clientes/plantilla_clientes.csv'); const contenido = await respuesta.text(); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' })); link.download = 'plantilla_clientes.csv'; link.click(); URL.revokeObjectURL(link.href); }));
    const archivoCsv = document.getElementById('csv-file'); const procesarCsv = document.getElementById('process-csv');
    const actualizarEstadoCsv = () => { const disponible = Boolean(archivoCsv?.files?.length); if (procesarCsv) { procesarCsv.disabled = !disponible; procesarCsv.classList.toggle('ready', disponible); } const etiqueta = document.querySelector('.client-csv-dropzone strong'); if (etiqueta && disponible) etiqueta.textContent = archivoCsv.files[0].name; };
    archivoCsv?.addEventListener('change', actualizarEstadoCsv); archivoCsv?.addEventListener('input', actualizarEstadoCsv);
    procesarCsv?.addEventListener('click', async () => { if (!archivoCsv.files?.length) return; const datos = new FormData(); datos.append('file', archivoCsv.files[0]); procesarCsv.disabled = true; procesarCsv.classList.remove('ready'); procesarCsv.textContent = 'Procesando...'; try { const respuesta = await fetch('/api/clientes/importar-csv', { method: 'POST', body: datos }); const carga = await respuesta.json(); if (!respuesta.ok) throw new Error([carga.error, ...(carga.errors || [])].filter(Boolean).join('\n')); alert(`${carga.data.imported} contactos importados correctamente.`); archivoCsv.value = ''; modalCsv.hidden = true; document.body.classList.remove('modal-open'); await cargar(); } catch (error) { alert(error.message); } finally { procesarCsv.disabled = !archivoCsv.files?.length; procesarCsv.classList.toggle('ready', Boolean(archivoCsv.files?.length)); procesarCsv.textContent = '✓ Procesar e Importar'; } });
    document.addEventListener('click', event => { if (event.target.closest('#clients-rows .btn-edit-action')) { document.getElementById('nuevo-cliente-title').textContent = 'Actualizar Contacto'; document.querySelector('#nuevo-cliente-form .client-save-button').textContent = '✓ Actualizar Contacto'; } if (event.target.closest('#btn-nuevo-cliente')) { document.getElementById('nuevo-cliente-title').textContent = 'Registrar Nuevo Contacto'; document.querySelector('#nuevo-cliente-form .client-save-button').textContent = '✓ Guardar Contacto'; } });
    cargaCatalogos = cargarCatalogos().catch(error => { console.error(error); });
    cargar();
});
