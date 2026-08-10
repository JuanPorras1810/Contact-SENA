document.addEventListener('DOMContentLoaded', () => {
    const filasDirectorio = document.getElementById('advisors-rows');
    const filasAsignaciones = document.getElementById('assignments-rows');
    const formularioAsesor = document.getElementById('nuevo-agente-form');
    const formularioAsignacion = document.getElementById('asignar-campana-form');
    const modalAsesor = document.getElementById('modal-nuevo-agente');
    const modalAsignacion = document.getElementById('modal-asignar-campana');
    const busquedas = document.querySelectorAll('.search-action-bar input');
    const filtrosCampana = document.querySelectorAll('.select-camp-opciones');
    let asesores = [];
    let idEdicion = null;
    let idEdicionAsignacion = null;
    let geografia = null;

    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const establecerOpciones = (selector, elementos, etiqueta = 'Seleccione...') => {
        if (selector) selector.replaceChildren(new Option(etiqueta, ''), ...(elementos || []).map(elemento => new Option(elemento.name, elemento.id)));
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
        const termino = (busquedas[0]?.value || '').toLowerCase().trim();
        const terminoCampana = filtrosCampana[0]?.value || '';
        const asesoresUnicos = [...new Map(asesores.map(asesor => [asesor.id, asesor])).values()];
        filasDirectorio?.replaceChildren();
        filasAsignaciones?.replaceChildren();
        asesoresUnicos.filter(asesor => !termino || `${asesor.name} ${asesor.id} ${asesor.email}`.toLowerCase().includes(termino)).forEach(asesor => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>Cédula de Ciudadanía</strong></td><td>${escaparHtml(asesor.id)}</td><td>${escaparHtml(asesor.name)}</td><td>${escaparHtml(asesor.email)}</td><td>${escaparHtml(asesor.phone)}</td><td>${escaparHtml(asesor.address)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar agente">✎</button></td>`;
            fila.querySelector('button')?.addEventListener('click', () => abrirEdicion(asesor));
            filasDirectorio?.appendChild(fila);
        });
        asesores.filter(asesor => asesor.campaign && (!terminoCampana || String(asesor.campaignId) === terminoCampana)).sort((primero, segundo) => Number(primero.assignmentId) - Number(segundo.assignmentId)).forEach((asesor, indice) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td>${escaparHtml(asesor.assignmentId || indice + 1)}</td><td>${escaparHtml(asesor.name)}</td><td>${escaparHtml(asesor.campaign)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar asignación">✎</button></td>`;
            fila.querySelector('button')?.addEventListener('click', () => abrirEdicionAsignacion(asesor));
            filasAsignaciones?.appendChild(fila);
        });
        if (filasDirectorio && !filasDirectorio.children.length) filasDirectorio.innerHTML = '<tr><td colspan="7" class="empty-table-state">No hay asesores registrados.</td></tr>';
        if (filasAsignaciones && !filasAsignaciones.children.length) filasAsignaciones.innerHTML = '<tr><td colspan="4" class="empty-table-state">No hay asignaciones para esta campaña.</td></tr>';
    };
    const cargar = async () => {
        const respuesta = await fetch('/api/asesores');
        if (!respuesta.ok) throw new Error('No se pudieron cargar los agentes');
        const carga = await respuesta.json();
        asesores = carga.data || [];
        const respuestaCampanas = await fetch('/api/campanas');
        const cargaCampanas = respuestaCampanas.ok ? await respuestaCampanas.json() : { data: [] };
        establecerOpciones(document.getElementById('asignacion-agente'), [...new Map(asesores.map(asesor => [asesor.id, asesor])).values()], 'Seleccione un agente...');
        establecerOpciones(document.getElementById('asignacion-campana'), cargaCampanas.data, 'Seleccione una campaña...');
        const respuestaCatalogos = await fetch('/api/catalogos/operativos');
        if (respuestaCatalogos.ok) { const catalogos = await respuestaCatalogos.json(); establecerOpciones(document.getElementById('agente-tipo-documento'), catalogos.documentTypes); }
        filtrosCampana.forEach(selector => establecerOpciones(selector, cargaCampanas.data, 'Todas las campañas'));
        renderizar();
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
        if (campoDocumento) { campoDocumento.readOnly = true; campoDocumento.title = 'La clave primaria no se puede modificar'; }
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
        abrirModal(modalAsignacion);
    };
    document.getElementById('btn-nuevo-agente')?.addEventListener('click', () => { idEdicion = null; formularioAsesor?.reset(); const campoDocumento = document.getElementById('agente-documento'); if (campoDocumento) { campoDocumento.readOnly = false; campoDocumento.title = ''; } const campoContrasena = document.getElementById('agente-contrasena'); if (campoContrasena) { campoContrasena.required = true; campoContrasena.placeholder = 'Crea una contraseña de acceso'; document.querySelector('label[for="agente-contrasena"]').textContent = 'Contraseña de acceso *'; } document.getElementById('nuevo-agente-title').textContent = 'Registrar Nuevo Agente / Aprendiz'; document.querySelector('#nuevo-agente-form .advisor-save-button').textContent = '✓ Registrar Agente'; abrirModal(modalAsesor); });
    document.getElementById('btn-asignar-campana')?.addEventListener('click', () => { idEdicionAsignacion = null; document.getElementById('asignar-campana-title').textContent = 'Nueva Asignación a Campaña'; document.querySelector('#asignar-campana-form .assignment-save-button').textContent = '✓ Registrar Asignación'; formularioAsignacion?.reset(); abrirModal(modalAsignacion); });
    document.querySelectorAll('[data-close-advisor-modal]').forEach(boton => boton.addEventListener('click', cerrarModales));
    busquedas.forEach(entrada => entrada.addEventListener('input', renderizar));
    filtrosCampana.forEach(entrada => entrada.addEventListener('change', renderizar));
    formularioAsesor?.addEventListener('submit', async evento => {
        evento.preventDefault();
        const cuerpo = { id: document.getElementById('agente-documento').value.trim(), documentTypeId: document.getElementById('agente-tipo-documento').value, neighborhoodId: document.getElementById('agente-barrio').value, name: document.getElementById('agente-nombre').value.trim(), email: document.getElementById('agente-correo').value.trim(), password: document.getElementById('agente-contrasena').value, phone: document.getElementById('agente-telefono').value.trim(), phoneAlt: document.getElementById('agente-telefono-alt').value.trim(), address: document.getElementById('agente-direccion').value.trim(), photo: document.getElementById('agente-avatar').value.trim() };
        try { const respuesta = await fetch(idEdicion ? `/api/asesores/${idEdicion}` : '/api/asesores', { method: idEdicion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); const carga = await respuesta.json(); if (!respuesta.ok) throw new Error(carga.error || 'No se pudo guardar el agente'); cerrarModales(); await cargar(); } catch (error) { alert(error.message); }
    });
    formularioAsignacion?.addEventListener('submit', async evento => {
        evento.preventDefault();
        try { const ruta = idEdicionAsignacion ? `/api/panel/asignaciones/${idEdicionAsignacion}` : '/api/panel/asignaciones'; const respuesta = await fetch(ruta, { method: idEdicionAsignacion ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: document.getElementById('asignacion-agente').value, campaignId: document.getElementById('asignacion-campana').value }) }); const carga = await respuesta.json(); if (!respuesta.ok) throw new Error(carga.error || 'No se pudo guardar la asignación'); cerrarModales(); await cargar(); } catch (error) { alert(error.message); }
    });
    cargarGeografia().catch(error => console.error(error));
    cargar().catch(error => console.error(error));
});
