document.addEventListener('DOMContentLoaded', () => {
    const cuerpo = document.getElementById('tipification-rows');
    const vacio = document.getElementById('tipifications-empty');
    const contador = document.querySelector('.tipification-count');
    const busqueda = document.getElementById('tipification-search');
    const sugerencias = document.getElementById('tipification-search-suggestions');
    const modal = document.getElementById('tipification-modal');
    const formulario = document.getElementById('tipification-form');
    const botonNuevo = document.getElementById('btn-nueva-tipificacion');
    const tituloModal = document.getElementById('tipification-modal-title');
    const campoNombre = document.getElementById('tipification-name');
    const campoEstado = document.getElementById('tipification-status');
    const botonGuardar = formulario?.querySelector('.client-save-button');
    if (!cuerpo || !modal || !formulario || !botonNuevo) return;

    let tipificaciones = [];
    let estados = [];
    let edicionId = null;

    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    const normalizarBusqueda = valor => normalizar(valor).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const claseEstado = statusId => {
        if (Number(statusId) === 1) return 'tipification-status status-effective';
        if (Number(statusId) === 2) return 'tipification-status status-progress';
        return 'tipification-status status-unmanaged';
    };
    const abrirModal = () => { modal.hidden = false; document.body.classList.add('modal-open'); };
    const cerrarModal = () => { modal.hidden = true; document.body.classList.remove('modal-open'); };

    const renderizar = () => {
        const termino = normalizarBusqueda(busqueda?.value);
        const visibles = tipificaciones.filter(item => {
            if (!termino) return true;
            return normalizarBusqueda(`${item.id} ${item.name} ${item.status}`).includes(termino);
        });
        cuerpo.replaceChildren();
        visibles.forEach(item => {
            const fila = document.createElement('tr');
            const usos = Number(item.usageCount || 0);
            fila.innerHTML = `<td><strong class="cod-blue">#${escaparHtml(item.id)}</strong></td>
                <td><span class="tipification-name">${escaparHtml(item.name)}</span></td>
                <td><span class="${claseEstado(item.statusId)}">${escaparHtml(item.status)}</span></td>
                <td><span class="tipification-usage">${usos} ${usos === 1 ? 'gestión' : 'gestiones'}</span></td>
                <td><div class="tipification-actions">
                    <button type="button" class="btn-edit-action" data-action="edit" data-id="${escaparHtml(item.id)}" aria-label="Editar tipificación" title="Editar">✎</button>
                </div></td>`;
            cuerpo.appendChild(fila);
        });
        if (contador) contador.textContent = `${visibles.length} ${visibles.length === 1 ? 'tipificación' : 'tipificaciones'}`;
        if (vacio) vacio.hidden = visibles.length > 0;
    };
    const renderizarSugerencias = () => {
        if (!busqueda || !sugerencias) return;
        const termino = normalizarBusqueda(busqueda.value);
        sugerencias.replaceChildren();
        const coincidencias = tipificaciones.filter(item =>
            !termino || normalizarBusqueda(`${item.id} ${item.name} ${item.status}`).includes(termino)
        ).slice(0, 8);
        coincidencias.forEach(item => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'autocomplete-suggestion tipification-search-suggestion';
            opcion.setAttribute('role', 'option');
            opcion.textContent = `${item.id} - ${item.name}`;
            opcion.addEventListener('mousedown', event => event.preventDefault());
            opcion.addEventListener('click', () => {
                busqueda.value = `${item.id} - ${item.name}`;
                renderizar();
                sugerencias.hidden = true;
                busqueda.setAttribute('aria-expanded', 'false');
            });
            sugerencias.appendChild(opcion);
        });
        if (!coincidencias.length) {
            const vacioSugerencias = document.createElement('div');
            vacioSugerencias.className = 'autocomplete-suggestion';
            vacioSugerencias.textContent = 'No se encontraron tipificaciones.';
            sugerencias.appendChild(vacioSugerencias);
        }
        sugerencias.hidden = false;
        busqueda.setAttribute('aria-expanded', 'true');
    };
    const cargarEstados = async () => {
        const respuesta = await fetch('/api/tipificaciones/estados');
        if (!respuesta.ok) throw new Error('No se pudieron cargar los estados de caso');
        const datos = await respuesta.json();
        estados = datos.data || [];
        campoEstado.replaceChildren(new Option('Seleccione...', ''));
        estados.forEach(estado => campoEstado.appendChild(new Option(estado.name, estado.id)));
    };

    const cargarTipificaciones = async () => {
        const respuesta = await fetch('/api/tipificaciones');
        if (!respuesta.ok) throw new Error('No se pudieron cargar las tipificaciones');
        const datos = await respuesta.json();
        tipificaciones = (datos.data || []).sort((primero, segundo) => Number(segundo.id) - Number(primero.id));
        renderizar();
        if (document.activeElement === busqueda) renderizarSugerencias();
    };

    const reiniciarFormulario = () => {
        edicionId = null;
        formulario.reset();
        campoEstado.value = '';
        tituloModal.textContent = 'Nueva Tipificación';
        if (botonGuardar) botonGuardar.textContent = '✓ Guardar Tipificación';
    };

    const editar = id => {
        const item = tipificaciones.find(tipificacion => String(tipificacion.id) === String(id));
        if (!item) return;
        edicionId = item.id;
        campoNombre.value = item.name;
        campoEstado.value = String(item.statusId);
        tituloModal.textContent = 'Editar Tipificación';
        if (botonGuardar) botonGuardar.textContent = '✓ Actualizar Tipificación';
        abrirModal();
        campoNombre.focus();
    };

    botonNuevo.addEventListener('click', () => { reiniciarFormulario(); abrirModal(); campoNombre.focus(); });
    document.getElementById('close-tipification-modal')?.addEventListener('click', cerrarModal);
    document.getElementById('cancel-tipification')?.addEventListener('click', cerrarModal);
    busqueda?.addEventListener('input', () => { renderizar(); renderizarSugerencias(); });
    busqueda?.addEventListener('focus', renderizarSugerencias);
    document.addEventListener('click', event => {
        if (!event.target.closest('.tipification-filter-autocomplete')) {
            if (sugerencias) sugerencias.hidden = true;
            busqueda?.setAttribute('aria-expanded', 'false');
        }
    });

    cuerpo.addEventListener('click', event => {
        const boton = event.target.closest('[data-action]');
        if (!boton) return;
        if (boton.dataset.action === 'edit') editar(boton.dataset.id);
    });

    formulario.addEventListener('submit', async event => {
        event.preventDefault();
        const nombre = campoNombre.value.trim();
        const statusId = Number(campoEstado.value);
        if (!nombre) { alert('Escribe el nombre de la tipificación.'); return; }
        if (!Number.isInteger(statusId) || statusId <= 0) { alert('Selecciona el estado del caso.'); return; }
        if (botonGuardar) botonGuardar.disabled = true;
        try {
            const respuesta = await fetch(edicionId ? `/api/tipificaciones/${encodeURIComponent(edicionId)}` : '/api/tipificaciones', {
                method: edicionId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nombre, statusId })
            });
            const datos = await respuesta.json();
            if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la tipificación');
            cerrarModal();
            reiniciarFormulario();
            await cargarTipificaciones();
        } catch (error) { alert(error.message); }
        finally { if (botonGuardar) botonGuardar.disabled = false; }
    });

    Promise.all([cargarEstados(), cargarTipificaciones()]).catch(error => {
        console.error(error);
        alert(error.message);
    });
});
