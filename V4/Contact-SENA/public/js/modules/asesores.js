document.addEventListener('DOMContentLoaded', () => {
    const filasDirectorio = document.getElementById('advisors-rows');
    const filasAsignaciones = document.getElementById('assignments-rows');
    const formularioAsesor = document.getElementById('nuevo-agente-form');
    const formularioAsignacion = document.getElementById('asignar-campana-form');
    const modalAsesor = document.getElementById('modal-nuevo-agente');
    const modalAsignacion = document.getElementById('modal-asignar-campana');
    const busquedas = document.querySelectorAll('.search-action-bar input');
    const busquedaDirectorio = document.getElementById('advisor-directory-search');
    const sugerenciasDirectorio = document.getElementById('advisor-directory-suggestions');
    const busquedaAsignacion = document.getElementById('assignment-search-input');
    const tipoBusquedaAsignacion = document.getElementById('assignment-search-type');
    const limpiarBusquedaAsignacion = document.getElementById('assignment-search-clear');
    const sugerenciasAsignacion = document.getElementById('assignment-search-suggestions');
    const controlBusquedaAsignacion = document.getElementById('assignment-search-control');
    let asesores = [];
    let idEdicion = null;
    let idEdicionAsignacion = null;
    let geografia = null;
    let campanasDisponibles = [];
    let seleccionBusquedaAsignacion = null;

    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const normalizarBusqueda = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const establecerOpciones = (selector, elementos, etiqueta = 'Seleccione...') => {
        if (selector) selector.replaceChildren(new Option(etiqueta, ''), ...(elementos || []).map(elemento => new Option(elemento.name, elemento.id)));
    };
    const configurarAutocompletado = ({ inputId, hiddenId, listId, obtenerTexto, obtenerValor, obtenerElementos }) => {
        const input = document.getElementById(inputId);
        const hidden = document.getElementById(hiddenId);
        const lista = document.getElementById(listId);
        if (!input || !hidden || !lista) return;
        const cerrar = () => { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); };
        const mostrar = () => {
            const textoSeleccionado = input.dataset.selectedValue === hidden.value;
            const termino = textoSeleccionado ? '' : input.value.trim().toLowerCase();
            const coincidencias = obtenerElementos().filter(elemento => obtenerTexto(elemento).toLowerCase().includes(termino));
            lista.replaceChildren();
            coincidencias.forEach(elemento => {
                const opcion = document.createElement('button');
                opcion.type = 'button';
                opcion.className = 'autocomplete-suggestion';
                opcion.setAttribute('role', 'option');
                opcion.textContent = obtenerTexto(elemento);
                opcion.addEventListener('mousedown', event => event.preventDefault());
                opcion.addEventListener('click', () => {
                    hidden.value = obtenerValor(elemento);
                    input.value = obtenerTexto(elemento);
                    input.dataset.selectedValue = hidden.value;
                    cerrar();
                });
                lista.appendChild(opcion);
            });
            lista.hidden = !coincidencias.length;
            input.setAttribute('aria-expanded', String(Boolean(coincidencias.length)));
        };
        input.addEventListener('focus', mostrar);
        input.addEventListener('input', () => { hidden.value = ''; delete input.dataset.selectedValue; mostrar(); });
        input.addEventListener('keydown', event => { if (event.key === 'Escape') cerrar(); });
        document.addEventListener('click', event => { if (!input.closest('.autocomplete-field')?.contains(event.target)) cerrar(); });
    };
    const abrirModal = modal => { if (modal) { modal.hidden = false; document.body.classList.add('modal-open'); } };
    const cerrarModales = () => { if (modalAsesor) modalAsesor.hidden = true; if (modalAsignacion) modalAsignacion.hidden = true; document.body.classList.remove('modal-open'); };
    const cargarMunicipios = idDepartamento => {
        const municipios = geografia?.municipalities.filter(elemento => String(elemento.departmentId) === String(idDepartamento));
        establecerOpciones(document.getElementById('agente-municipio'), municipios);
        establecerOpciones(document.getElementById('agente-barrio'), []);
    };
    const cargarBarrios = idMunicipio => establecerOpciones(document.getElementById('agente-barrio'), geografia?.neighborhoods.filter(elemento => String(elemento.municipalityId) === String(idMunicipio)));
    const establecerUbicacion = asesor => {
        const departamento = document.getElementById('agente-departamento');
        const municipio = document.getElementById('agente-municipio');
        const barrio = document.getElementById('agente-barrio');
        if (!geografia || !departamento || !municipio || !barrio) return;
        establecerOpciones(departamento, geografia.departments);
        departamento.value = String(asesor.departmentId || '');
        cargarMunicipios(asesor.departmentId);
        municipio.value = String(asesor.municipalityId || '');
        cargarBarrios(asesor.municipalityId);
        barrio.value = String(asesor.neighborhoodId || '');
    };
    const renderizar = () => {
        const terminoDirectorio = (busquedas[0]?.value || '').toLowerCase().trim();
        const terminoAsignaciones = (busquedas[1]?.value || '').toLowerCase().trim();
        const coincide = (termino, ids, nombres) => {
            if (!termino) return true;
            const texto = normalizarBusqueda(termino.trim());
            return normalizarBusqueda([...ids, ...nombres].join(' ')).includes(texto);
        };
        const asesoresUnicos = [...new Map(asesores.map(asesor => [asesor.id, asesor])).values()];
        filasDirectorio?.replaceChildren();
        filasAsignaciones?.replaceChildren();
        const asesoresVisibles = asesoresUnicos.filter(asesor => coincide(terminoDirectorio, [asesor.id], [asesor.name]));
        asesoresVisibles.forEach(asesor => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>Cédula de Ciudadanía</strong></td><td>${escaparHtml(asesor.id)}</td><td>${escaparHtml(asesor.name)}</td><td>${escaparHtml(asesor.email)}</td><td>${escaparHtml(asesor.phone)}</td><td>${escaparHtml(asesor.address)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar agente">✎</button></td>`;
            fila.querySelector('button')?.addEventListener('click', () => abrirEdicion(asesor));
            filasDirectorio?.appendChild(fila);
        });
        const asignacionesVisibles = asesores.filter(asesor => {
            if (!asesor.campaign) return false;
            if (!terminoAsignaciones) return true;
            if (seleccionBusquedaAsignacion) {
                return seleccionBusquedaAsignacion.tipo === 'agent'
                    ? String(asesor.id) === seleccionBusquedaAsignacion.id
                    : String(asesor.campaignId) === seleccionBusquedaAsignacion.id;
            }
            const tipo = tipoBusquedaAsignacion?.value || 'agent';
            const campo = tipo === 'agent'
                ? `${asesor.id} ${asesor.name}`
                : `${asesor.campaignId} ${asesor.campaign}`;
            return normalizarBusqueda(campo).includes(normalizarBusqueda(terminoAsignaciones.trim()));
        }).sort((primero, segundo) => Number(primero.assignmentId) - Number(segundo.assignmentId));
        asignacionesVisibles.forEach((asesor, indice) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td>${escaparHtml(asesor.assignmentId || indice + 1)}</td><td>${escaparHtml(asesor.name)}</td><td>${escaparHtml(asesor.campaign)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar asignación">✎</button></td>`;
            fila.querySelector('button')?.addEventListener('click', () => abrirEdicionAsignacion(asesor));
            filasAsignaciones?.appendChild(fila);
        });
        const contadorAsesores = document.getElementById('advisors-count');
        const contadorAsignaciones = document.getElementById('assignments-count');
        if (contadorAsesores) contadorAsesores.textContent = `${asesoresVisibles.length} ${asesoresVisibles.length === 1 ? 'agente' : 'agentes'}`;
        if (contadorAsignaciones) contadorAsignaciones.textContent = `${asignacionesVisibles.length} ${asignacionesVisibles.length === 1 ? 'asignación' : 'asignaciones'}`;
        if (filasDirectorio && !filasDirectorio.children.length) filasDirectorio.innerHTML = '<tr><td colspan="7" class="empty-table-state">No hay asesores registrados.</td></tr>';
        if (filasAsignaciones && !filasAsignaciones.children.length) filasAsignaciones.innerHTML = '<tr><td colspan="4" class="empty-table-state">No hay asignaciones para esta campaña.</td></tr>';
    };
    const cerrarSugerenciasDirectorio = () => {
        if (sugerenciasDirectorio) sugerenciasDirectorio.hidden = true;
        busquedaDirectorio?.setAttribute('aria-expanded', 'false');
    };
    const mostrarSugerenciasDirectorio = () => {
        if (!busquedaDirectorio || !sugerenciasDirectorio) return;
        const termino = normalizarBusqueda(busquedaDirectorio.value);
        const unicos = [...new Map(asesores.map(asesor => [String(asesor.id), asesor])).values()];
        const coincidencias = unicos.filter(asesor =>
            !termino || normalizarBusqueda(`${asesor.id} ${asesor.name}`).includes(termino)
        ).slice(0, 8);
        sugerenciasDirectorio.replaceChildren();
        coincidencias.forEach(asesor => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'autocomplete-suggestion advisor-directory-suggestion';
            opcion.setAttribute('role', 'option');
            opcion.textContent = `${asesor.id} - ${asesor.name}`;
            opcion.addEventListener('mousedown', event => event.preventDefault());
            opcion.addEventListener('click', () => {
                busquedaDirectorio.value = `${asesor.id} - ${asesor.name}`;
                renderizar();
                cerrarSugerenciasDirectorio();
            });
            sugerenciasDirectorio.appendChild(opcion);
        });
        if (!coincidencias.length && termino) {
            const vacio = document.createElement('div');
            vacio.className = 'autocomplete-suggestion';
            vacio.textContent = 'Sin coincidencias...';
            sugerenciasDirectorio.appendChild(vacio);
        }
        sugerenciasDirectorio.hidden = !sugerenciasDirectorio.children.length;
        busquedaDirectorio.setAttribute('aria-expanded', String(!sugerenciasDirectorio.hidden));
    };
    const actualizarLimpiarAsignacion = () => {
        if (limpiarBusquedaAsignacion) limpiarBusquedaAsignacion.hidden = !busquedaAsignacion?.value;
    };
    const cerrarSugerenciasAsignacion = () => {
        if (sugerenciasAsignacion) sugerenciasAsignacion.hidden = true;
        busquedaAsignacion?.setAttribute('aria-expanded', 'false');
    };
    const mostrarSugerenciasAsignacion = () => {
        if (!busquedaAsignacion || !sugerenciasAsignacion) return;
        const tipo = tipoBusquedaAsignacion?.value || 'agent';
        const termino = normalizarBusqueda(busquedaAsignacion.value.trim());
        const opciones = new Map();
        if (tipo === 'agent') {
            asesores.filter(asesor => asesor.campaign).forEach(asesor => {
                const id = String(asesor.id || '');
                const nombre = String(asesor.name || '');
                if (id && (!termino || normalizarBusqueda(`${id} ${nombre}`).includes(termino)) && !opciones.has(id)) {
                    opciones.set(id, { id, texto: `${id} - ${nombre}` });
                }
            });
        } else {
            asesores.forEach(asesor => {
                const id = String(asesor.campaignId || '');
                const nombre = String(asesor.campaign || '');
                if (id && nombre && (!termino || normalizarBusqueda(`${id} ${nombre}`).includes(termino)) && !opciones.has(id)) {
                    opciones.set(id, { id, texto: `${id} - ${nombre}` });
                }
            });
        }
        sugerenciasAsignacion.replaceChildren();
        opciones.forEach(opcion => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'assignment-search-suggestion';
            boton.setAttribute('role', 'option');
            boton.textContent = opcion.texto;
            boton.addEventListener('mousedown', event => event.preventDefault());
            boton.addEventListener('click', () => {
                seleccionBusquedaAsignacion = { tipo, id: opcion.id };
                busquedaAsignacion.value = opcion.texto;
                actualizarLimpiarAsignacion();
                cerrarSugerenciasAsignacion();
                renderizar();
            });
            sugerenciasAsignacion.appendChild(boton);
        });
        if (!sugerenciasAsignacion.children.length && termino) {
            const vacio = document.createElement('div');
            vacio.className = 'assignment-search-suggestion assignment-search-no-results';
            vacio.textContent = 'Sin coincidencias...';
            sugerenciasAsignacion.appendChild(vacio);
        }
        sugerenciasAsignacion.hidden = !sugerenciasAsignacion.children.length;
        busquedaAsignacion.setAttribute('aria-expanded', String(!sugerenciasAsignacion.hidden));
    };
    const cargar = async () => {
        const respuesta = await fetch('/api/asesores');
        if (!respuesta.ok) throw new Error('No se pudieron cargar los agentes');
        const carga = await respuesta.json();
        asesores = carga.data || [];
        const respuestaCampanas = await fetch('/api/campanas');
        const cargaCampanas = respuestaCampanas.ok ? await respuestaCampanas.json() : { data: [] };
        campanasDisponibles = cargaCampanas.data || [];
        const respuestaCatalogos = await fetch('/api/catalogos/operativos');
        if (respuestaCatalogos.ok) { const catalogos = await respuestaCatalogos.json(); establecerOpciones(document.getElementById('agente-tipo-documento'), catalogos.documentTypes); }
        renderizar();
        if (document.activeElement === busquedaDirectorio) mostrarSugerenciasDirectorio();
        if (document.activeElement === busquedaAsignacion) mostrarSugerenciasAsignacion();
    };
    const cargarGeografia = async () => {
        const respuesta = await fetch('/api/catalogos/geografia');
        if (!respuesta.ok) throw new Error('No se pudo cargar la geografía');
        geografia = await respuesta.json();
        establecerOpciones(document.getElementById('agente-departamento'), geografia.departments);
        establecerOpciones(document.getElementById('agente-municipio'), []);
        establecerOpciones(document.getElementById('agente-barrio'), []);
        document.getElementById('agente-departamento')?.addEventListener('change', evento => cargarMunicipios(evento.target.value));
        document.getElementById('agente-municipio')?.addEventListener('change', evento => cargarBarrios(evento.target.value));
    };
    const abrirEdicion = asesor => {
        idEdicion = asesor.id;
        abrirModal(modalAsesor);
        document.getElementById('nuevo-agente-title').textContent = 'Actualizar Agente';
        document.querySelector('#nuevo-agente-form .advisor-save-button').textContent = '✓ Actualizar Agente';
        const campoDocumento = document.getElementById('agente-documento');
        if (campoDocumento) {
            campoDocumento.readOnly = true;
            campoDocumento.disabled = true;
            campoDocumento.setAttribute('aria-readonly', 'true');
            campoDocumento.title = 'El número de documento no se puede modificar al actualizar el asesor';
        }
        const campoContrasena = document.getElementById('agente-contrasena');
        if (campoContrasena) { campoContrasena.value = ''; campoContrasena.required = false; campoContrasena.placeholder = 'Dejar vacío para conservar la actual'; document.querySelector('label[for="agente-contrasena"]').textContent = 'Contraseña de acceso'; }
        Object.entries({ 'agente-documento': asesor.id, 'agente-tipo-documento': asesor.documentTypeId, 'agente-nombre': asesor.name, 'agente-correo': asesor.email, 'agente-telefono': asesor.phone, 'agente-direccion': asesor.address, 'agente-avatar': asesor.photo }).forEach(([id, valor]) => { const nodo = document.getElementById(id); if (nodo && valor !== undefined && valor !== null) nodo.value = valor; });
        establecerUbicacion(asesor);
    };
    const abrirEdicionAsignacion = asignacion => {
        idEdicionAsignacion = asignacion.assignmentId;
        document.getElementById('asignar-campana-title').textContent = 'Actualizar Asignación de Campaña';
        document.querySelector('#asignar-campana-form .assignment-save-button').textContent = '✓ Actualizar Asignación';
        document.getElementById('asignacion-agente').value = String(asignacion.id || '');
        document.getElementById('asignacion-campana').value = String(asignacion.campaignId || '');
        document.getElementById('asignacion-agente-busqueda').value = `${asignacion.id || ''} - ${asignacion.name || ''}`;
        document.getElementById('asignacion-campana-busqueda').value = String(asignacion.campaign || '');
        document.getElementById('asignacion-agente-busqueda').dataset.selectedValue = String(asignacion.id || '');
        document.getElementById('asignacion-campana-busqueda').dataset.selectedValue = String(asignacion.campaignId || '');
        abrirModal(modalAsignacion);
    };
    document.getElementById('btn-nuevo-agente')?.addEventListener('click', () => { idEdicion = null; formularioAsesor?.reset(); const campoDocumento = document.getElementById('agente-documento'); if (campoDocumento) { campoDocumento.readOnly = false; campoDocumento.disabled = false; campoDocumento.removeAttribute('aria-readonly'); campoDocumento.title = ''; } const campoContrasena = document.getElementById('agente-contrasena'); if (campoContrasena) { campoContrasena.required = true; campoContrasena.placeholder = 'Crea una contraseña de acceso'; document.querySelector('label[for="agente-contrasena"]').textContent = 'Contraseña de acceso *'; } document.getElementById('nuevo-agente-title').textContent = 'Registrar Nuevo Agente / Aprendiz'; document.querySelector('#nuevo-agente-form .advisor-save-button').textContent = '✓ Registrar Agente'; abrirModal(modalAsesor); });
    document.getElementById('btn-asignar-campana')?.addEventListener('click', () => { idEdicionAsignacion = null; document.getElementById('asignar-campana-title').textContent = 'Nueva Asignación a Campaña'; document.querySelector('#asignar-campana-form .assignment-save-button').textContent = '✓ Registrar Asignación'; formularioAsignacion?.reset(); document.getElementById('asignacion-agente').value = ''; document.getElementById('asignacion-campana').value = ''; abrirModal(modalAsignacion); });
    document.querySelectorAll('[data-close-advisor-modal]').forEach(boton => boton.addEventListener('click', cerrarModales));
    busquedaDirectorio?.addEventListener('focus', mostrarSugerenciasDirectorio);
    busquedaDirectorio?.addEventListener('input', () => { renderizar(); mostrarSugerenciasDirectorio(); });
    busquedaDirectorio?.addEventListener('search', () => { renderizar(); mostrarSugerenciasDirectorio(); });
    document.addEventListener('click', event => {
        if (!event.target.closest('.advisor-directory-search')) cerrarSugerenciasDirectorio();
    });
    busquedaAsignacion?.addEventListener('focus', mostrarSugerenciasAsignacion);
    busquedaAsignacion?.addEventListener('input', () => { seleccionBusquedaAsignacion = null; actualizarLimpiarAsignacion(); renderizar(); mostrarSugerenciasAsignacion(); });
    tipoBusquedaAsignacion?.addEventListener('change', () => {
        seleccionBusquedaAsignacion = null;
        if (busquedaAsignacion) {
            busquedaAsignacion.value = '';
            busquedaAsignacion.placeholder = tipoBusquedaAsignacion.value === 'agent'
                ? 'Buscar agente por documento o nombre...'
                : 'Buscar campaña por código o nombre...';
        }
        actualizarLimpiarAsignacion();
        renderizar();
        busquedaAsignacion?.focus();
        mostrarSugerenciasAsignacion();
    });
    limpiarBusquedaAsignacion?.addEventListener('click', () => {
        seleccionBusquedaAsignacion = null;
        if (busquedaAsignacion) {
            busquedaAsignacion.value = '';
            busquedaAsignacion.focus();
        }
        actualizarLimpiarAsignacion();
        renderizar();
        cerrarSugerenciasAsignacion();
    });
    document.addEventListener('click', evento => {
        if (controlBusquedaAsignacion && !controlBusquedaAsignacion.contains(evento.target)) cerrarSugerenciasAsignacion();
    });
    formularioAsesor?.addEventListener('submit', async evento => {
        evento.preventDefault();
        const cuerpo = { id: document.getElementById('agente-documento').value.trim(), documentTypeId: document.getElementById('agente-tipo-documento').value, neighborhoodId: document.getElementById('agente-barrio').value, name: document.getElementById('agente-nombre').value.trim(), email: document.getElementById('agente-correo').value.trim(), password: document.getElementById('agente-contrasena').value, phone: document.getElementById('agente-telefono').value.trim(), phoneAlt: document.getElementById('agente-telefono-alt').value.trim(), address: document.getElementById('agente-direccion').value.trim(), photo: document.getElementById('agente-avatar').value.trim() };
        try { const respuesta = await fetch(idEdicion ? `/api/asesores/${idEdicion}` : '/api/asesores', { method: idEdicion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); const carga = await respuesta.json(); if (!respuesta.ok) throw new Error(carga.error || 'No se pudo guardar el agente'); cerrarModales(); await cargar(); } catch (error) { alert(error.message); }
    });
    formularioAsignacion?.addEventListener('submit', async evento => {
        evento.preventDefault();
        const agenteSeleccionado = document.getElementById('asignacion-agente').value;
        const campanaSeleccionada = document.getElementById('asignacion-campana').value;
        if (!agenteSeleccionado || !campanaSeleccionada) { alert('Selecciona o escribe un agente válido y una campaña válida.'); return; }
        try { const ruta = idEdicionAsignacion ? `/api/panel/asignaciones/${idEdicionAsignacion}` : '/api/panel/asignaciones'; const respuesta = await fetch(ruta, { method: idEdicionAsignacion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agenteSeleccionado, campaignId: campanaSeleccionada }) }); const carga = await respuesta.json(); if (!respuesta.ok) throw new Error(carga.error || 'No se pudo guardar la asignación'); cerrarModales(); await cargar(); } catch (error) { alert(error.message); }
    });
    configurarAutocompletado({
        inputId: 'asignacion-agente-busqueda',
        hiddenId: 'asignacion-agente',
        listId: 'asignacion-agente-sugerencias',
        obtenerElementos: () => [...new Map(asesores.map(asesor => [asesor.id, asesor])).values()],
        obtenerTexto: asesor => `${asesor.id} - ${asesor.name}`,
        obtenerValor: asesor => asesor.id
    });
    configurarAutocompletado({
        inputId: 'asignacion-campana-busqueda',
        hiddenId: 'asignacion-campana',
        listId: 'asignacion-campana-sugerencias',
        obtenerElementos: () => campanasDisponibles,
        obtenerTexto: campana => `${campana.id} - ${campana.name}`,
        obtenerValor: campana => campana.id
    });
    cargarGeografia().catch(error => console.error(error));
    cargar().catch(error => console.error(error));
});
