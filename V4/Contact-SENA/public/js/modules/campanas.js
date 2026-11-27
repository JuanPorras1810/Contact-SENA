document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.campaigns-grid');
    const count = document.querySelector('.campaign-count');
    const modal = document.getElementById('campaign-modal');
    const form = document.getElementById('campaign-form');
    const open = document.getElementById('open-campaign-modal');
    if (!modal || !form || !open) return;
    const title = document.getElementById('campaign-modal-title');
    const save = form.querySelector('.campaign-save');
    const file = document.getElementById('campaign-file');
    const fechaInicioInput = document.getElementById('campaign-start');
    const fechaFinInput = document.getElementById('campaign-end');
    const campaignSearch = document.getElementById('campaign-search');
    const campaignSearchId = document.getElementById('campaign-search-id');
    const availableZone = document.getElementById('available-typifications');
    const assignedZone = document.getElementById('assigned-typifications');
    const assignmentContainer = document.querySelector('.typification-assignment');
    const assignmentError = document.getElementById('typification-form-error');
    const assignmentModal = document.getElementById('typification-assignment-modal');
    const assignmentSummary = document.getElementById('typifications-summary-copy');
    const availableCount = document.getElementById('available-typification-count');
    const assignedCount = document.getElementById('assigned-typification-count');
    let editingId = null;
    let campanasDisponibles = [];
    let tipificacionesGlobales = [];
    let asignadas = new Set();
    let movimientoPuntero = null;

    const defaults = ['Contacto efectivo', 'Volver a llamar', 'Buzón de mensajes', 'Número equivocado'];
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const progresoCampana = (inicio, fin) => {
        const ahora = new Date();
        const fechaInicio = new Date(`${inicio}T00:00:00`);
        const fechaFinExclusiva = new Date(`${fin}T00:00:00`);
        fechaFinExclusiva.setDate(fechaFinExclusiva.getDate() + 1);
        if (ahora <= fechaInicio) return 0;
        if (ahora >= fechaFinExclusiva) return 100;
        const duracion = fechaFinExclusiva.getTime() - fechaInicio.getTime();
        return Math.max(0, Math.min(100, Math.round(((ahora.getTime() - fechaInicio.getTime()) / duracion) * 100)));
    };
    const vigenciaRestante = fin => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const fechaFin = new Date(`${fin}T00:00:00`);
        const dias = Math.ceil((fechaFin - hoy) / 86400000);
        if (dias < 0) return { texto: `Vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, alerta: true };
        if (dias === 0) return { texto: 'Vence hoy', alerta: true };
        return { texto: `${dias} ${dias === 1 ? 'día' : 'días'} rest.`, alerta: dias <= 7 };
    };
    const fechaActual = () => { const valor = new Date(); return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`; };
    const actualizarMinimoFechaFin = () => {
        if (!fechaFinInput) return;
        fechaFinInput.min = [fechaActual(), fechaInicioInput?.value || fechaActual()].sort().at(-1);
    };
    const claseEstado = statusId => {
        if (Number(statusId) === 1) return 'tipification-status status-effective';
        if (Number(statusId) === 2) return 'tipification-status status-progress';
        return 'tipification-status status-unmanaged';
    };

    const idsPredeterminados = () => {
        const buscados = new Set(defaults.map(normalizar));
        return new Set(tipificacionesGlobales.filter(item => buscados.has(normalizar(item.name))).map(item => String(item.id)));
    };

    const crearChip = (item, zona, index) => {
        const chip = document.createElement('div');
        const colorTipificacion = `typification-color-${(index % 6) + 1}`;
        chip.className = `typification-chip ${colorTipificacion}`;
        chip.draggable = false;
        chip.dataset.id = item.id;
        chip.dataset.zone = zona;
        chip.setAttribute('role', 'option');
        chip.setAttribute('aria-selected', String(zona === 'assigned'));
        chip.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest('button')) return;
            event.preventDefault();
            const rect = chip.getBoundingClientRect();
            movimientoPuntero = {
                id: String(item.id),
                zone: zona,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                chip,
                ghost: null
            };
            try { chip.setPointerCapture(event.pointerId); } catch { /* Pointer capture helps keep the drop event alive. */ }
        });
        const accion = zona === 'available' ? 'assign' : 'remove';
        const etiqueta = zona === 'available' ? `Asignar ${item.name}` : `Quitar ${item.name}`;
        const simbolo = zona === 'available' ? '+' : '×';
        chip.innerHTML = `<span class="typification-chip-name">${escaparHtml(item.name)}</span>
            <span class="${claseEstado(item.statusId)}">${escaparHtml(item.status)}</span>
            <button type="button" class="typification-chip-action ${accion}" data-typification-action="${accion}" aria-label="${escaparHtml(etiqueta)}">${simbolo}</button>`;
        return chip;
    };

    const renderizarTipificaciones = () => {
        if (!availableZone || !assignedZone) return;
        availableZone.replaceChildren();
        assignedZone.replaceChildren();
        tipificacionesGlobales.forEach((item, index) => {
            const asignada = asignadas.has(String(item.id));
            if (asignada) assignedZone.appendChild(crearChip(item, 'assigned', index));
            else availableZone.appendChild(crearChip(item, 'available', index));
        });
        if (availableCount) availableCount.textContent = String(availableZone.children.length);
        if (assignedCount) assignedCount.textContent = String(assignedZone.children.length);
        const selectedCount = asignadas.size;
        const selectedLabel = `${selectedCount} ${selectedCount === 1 ? 'tipificación seleccionada' : 'tipificaciones seleccionadas'}`;
        if (assignmentSummary) assignmentSummary.textContent = selectedCount ? selectedLabel : 'Aún no has seleccionado tipificaciones';
        const footerCount = document.getElementById('typification-assignment-footer-count');
        if (footerCount) footerCount.textContent = selectedLabel;
        if (assignmentError && asignadas.size) assignmentError.hidden = true;
    };

    const moverTipificacion = (id, zona) => {
        const clave = String(id);
        if (zona === 'assigned') asignadas.add(clave);
        else asignadas.delete(clave);
        renderizarTipificaciones();
    };

    const obtenerZonaBajoPuntero = (x, y) => {
        const elemento = document.elementFromPoint(x, y);
        return elemento?.closest('.typification-column')?.querySelector('.typification-dropzone')
            || elemento?.closest('.typification-dropzone')
            || null;
    };
    const actualizarVistaArrastre = event => {
        const movimiento = movimientoPuntero;
        if (!movimiento || movimiento.pointerId !== event.pointerId) return;
        const distancia = Math.hypot(event.clientX - movimiento.startX, event.clientY - movimiento.startY);
        if (!movimiento.ghost && distancia < 6) return;
        if (!movimiento.ghost) {
            movimiento.ghost = movimiento.chip.cloneNode(true);
            movimiento.ghost.classList.add('typification-drag-ghost');
            movimiento.ghost.classList.remove('dragging');
            movimiento.ghost.setAttribute('aria-hidden', 'true');
            movimiento.ghost.querySelectorAll('button').forEach(button => button.remove());
            movimiento.ghost.style.width = `${movimiento.width}px`;
            document.body.appendChild(movimiento.ghost);
            movimiento.chip.classList.add('dragging');
        }
        movimiento.ghost.style.transform = `translate3d(${event.clientX - movimiento.offsetX}px, ${event.clientY - movimiento.offsetY}px, 0)`;
        const zona = obtenerZonaBajoPuntero(event.clientX, event.clientY);
        document.querySelectorAll('.typification-dropzone.drag-over').forEach(elemento => {
            if (elemento !== zona) elemento.classList.remove('drag-over');
        });
        zona?.classList.add('drag-over');
        event.preventDefault();
    };
    document.addEventListener('pointermove', actualizarVistaArrastre, { passive: false });
    const terminarArrastrePuntero = event => {
        const movimiento = movimientoPuntero;
        if (!movimiento || movimiento.pointerId !== event.pointerId) return;
        const zona = movimiento.ghost
            ? obtenerZonaBajoPuntero(event.clientX, event.clientY)
            : null;
        movimiento.ghost?.remove();
        movimiento.chip.classList.remove('dragging');
        document.querySelectorAll('.typification-dropzone.drag-over').forEach(elemento => elemento.classList.remove('drag-over'));
        movimientoPuntero = null;
        if (zona && zona.dataset.zone !== movimiento.zone) moverTipificacion(movimiento.id, zona.dataset.zone);
    };
    document.addEventListener('pointerup', terminarArrastrePuntero);
    document.addEventListener('pointercancel', terminarArrastrePuntero);

    const filtrarCampanas = () => {
        const termino = campaignSearch?.value.trim().toLowerCase() || '';
        const textoNormalizado = termino.replace(/[^a-z0-9áéíóúüñ]+/gi, ' ').replace(/\s+/g, ' ').trim();
        const idSeleccionado = String(campaignSearchId?.value || '');
        [...(grid?.children || [])].forEach(tarjeta => {
            const coincide = idSeleccionado ? String(tarjeta.dataset.id) === idSeleccionado : !textoNormalizado || `${tarjeta.dataset.id} ${tarjeta.dataset.name}`.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi, ' ').includes(textoNormalizado);
            tarjeta.hidden = !coincide;
        });
        const visibles = [...(grid?.children || [])].filter(tarjeta => !tarjeta.hidden).length;
        if (count) count.textContent = `${visibles} ${visibles === 1 ? 'campaña' : 'campañas'}`;
    };

    const enlazarTarjetas = () => {
        document.querySelectorAll('.campaign-more').forEach(boton => boton.addEventListener('click', () => editar(boton.closest('.campaign-card'))));
        document.querySelectorAll('.campaign-tipifications').forEach(boton => boton.addEventListener('click', () => editar(boton.closest('.campaign-card'), true)));
    };

    const cargarCampanas = async () => {
        const response = await fetch('/api/campanas');
        if (!response.ok) throw new Error('No se pudieron cargar las campañas');
        const { data } = await response.json();
        campanasDisponibles = data || [];
        grid?.replaceChildren();
        campanasDisponibles.forEach(campana => {
            const tarjeta = document.createElement('article');
            const inicio = String(campana.startDate).slice(0, 10);
            const fin = String(campana.endDate).slice(0, 10);
            const progreso = progresoCampana(inicio, fin);
            const restante = vigenciaRestante(fin);
            const cantidadTipificaciones = Number(campana.typificationCount || 0);
            tarjeta.className = 'campaign-card';
            tarjeta.dataset.id = campana.id;
            tarjeta.dataset.name = campana.name;
            tarjeta.dataset.start = inicio;
            tarjeta.dataset.end = fin;
            tarjeta.dataset.file = campana.fileUrl || '';
            tarjeta.innerHTML = `<div class="campaign-card-top">
                <div class="campaign-identity">
                    <span class="campaign-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
                    <div class="campaign-identity-copy">
                        <div class="campaign-kicker-row"><span class="campaign-eyebrow">Campaña operativa</span></div>
                        <h4>${escaparHtml(campana.name)}</h4>
                    </div>
                </div>
                <button class="campaign-more" type="button" title="Editar campaña" aria-label="Editar ${escaparHtml(campana.name)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
            </div>
            <div class="campaign-date-box">
                <div class="campaign-dates">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <time>${formatearFecha(inicio)}</time><span class="campaign-date-arrow">→</span><time>${formatearFecha(fin)}</time>
                </div>
                <span class="campaign-days-remaining ${restante.alerta ? 'warning' : ''}">${escaparHtml(restante.texto)}</span>
            </div>
            <div class="campaign-progress-meta"><span>Avance del periodo</span><strong>${progreso}%</strong></div>
            <div class="campaign-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progreso}" aria-label="Progreso de la campaña">
                <span style="--progress:${progreso}%"></span>
            </div>
            <div class="campaign-card-footer">
                <button class="campaign-tipifications" type="button" title="Gestionar tipificaciones de la campaña">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <span><strong>${cantidadTipificaciones}</strong> ${cantidadTipificaciones === 1 ? 'tipificación' : 'tipificaciones'}</span>
                </button>
                ${campana.fileUrl ? `<a class="campaign-pdf campaign-pdf-active" href="${escaparHtml(campana.fileUrl)}" target="_blank" rel="noopener" title="Ver guía PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Guía PDF</a>` : `<span class="campaign-pdf campaign-pdf-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Sin PDF</span>`}
            </div>`;
            grid?.appendChild(tarjeta);
        });
        enlazarTarjetas();
        filtrarCampanas();
    };

    const cargarTipificaciones = async () => {
        const response = await fetch('/api/tipificaciones');
        if (!response.ok) throw new Error('No se pudieron cargar las tipificaciones');
        const { data } = await response.json();
        tipificacionesGlobales = data || [];
    };

    const close = () => { modal.hidden = true; document.body.classList.remove('modal-open'); };
    const reiniciar = () => {
        editingId = null;
        form.reset();
        fechaInicioInput.min = fechaActual();
        fechaInicioInput.value = fechaActual();
        actualizarMinimoFechaFin();
        asignadas = idsPredeterminados();
        renderizarTipificaciones();
        title.textContent = 'Crear Nueva Campaña Operativa';
        save.textContent = '✓ Guardar Campaña';
        file.required = false;
        document.getElementById('file-label').textContent = 'Arrastra y suelta tu archivo PDF aquí';
        if (assignmentError) assignmentError.hidden = true;
    };

    const editar = async (tarjeta, abrirSelectorTipificaciones = false) => {
        editingId = tarjeta.dataset.id;
        document.getElementById('campaign-name').value = tarjeta.querySelector('h4').textContent;
        fechaInicioInput.value = tarjeta.dataset.start;
        fechaInicioInput.min = fechaActual();
        fechaFinInput.value = tarjeta.dataset.end;
        actualizarMinimoFechaFin();
        file.required = false;
        asignadas = new Set();
        try {
            const response = await fetch(`/api/campanas/${editingId}/tipificaciones`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las tipificaciones');
            asignadas = new Set((payload.data || []).map(item => String(item.id)));
        } catch (error) { alert(error.message); }
        renderizarTipificaciones();
        title.textContent = 'Editar Campaña Operativa';
        save.textContent = '✓ Actualizar Campaña';
        modal.hidden = false;
        document.body.classList.add('modal-open');
        if (abrirSelectorTipificaciones) {
            modal.hidden = true;
            if (assignmentModal) assignmentModal.hidden = false;
            document.getElementById('open-typification-assignment')?.setAttribute('aria-expanded', 'true');
        }
    };

    open.addEventListener('click', () => {
        reiniciar();
        modal.hidden = false;
        document.body.classList.add('modal-open');
        document.getElementById('campaign-name').focus();
    });
    fechaInicioInput?.addEventListener('change', actualizarMinimoFechaFin);
    document.getElementById('close-campaign-modal').addEventListener('click', close);
    document.getElementById('cancel-campaign').addEventListener('click', close);
    const cerrarAsignacion = () => {
        if (assignmentModal) assignmentModal.hidden = true;
        modal.hidden = false;
        document.getElementById('open-typification-assignment')?.setAttribute('aria-expanded', 'false');
    };
    document.getElementById('open-typification-assignment')?.addEventListener('click', () => {
        renderizarTipificaciones();
        modal.hidden = true;
        if (assignmentModal) assignmentModal.hidden = false;
        document.getElementById('open-typification-assignment')?.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('close-typification-assignment')?.addEventListener('click', cerrarAsignacion);
    document.getElementById('done-typification-assignment')?.addEventListener('click', cerrarAsignacion);
    assignmentModal?.addEventListener('click', event => {
        if (event.target === assignmentModal) cerrarAsignacion();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && assignmentModal && !assignmentModal.hidden) cerrarAsignacion();
    });

    assignmentContainer?.addEventListener('click', event => {
        const boton = event.target.closest('[data-typification-action]');
        if (!boton) return;
        const chip = boton.closest('.typification-chip');
        if (!chip) return;
        moverTipificacion(chip.dataset.id, boton.dataset.typificationAction === 'assign' ? 'assigned' : 'available');
    });

    file.addEventListener('change', event => {
        const selected = event.target.files[0];
        if (selected && (selected.type !== 'application/pdf' || selected.size > 10 * 1024 * 1024)) { alert('Selecciona un PDF de máximo 10 MB.'); event.target.value = ''; return; }
        if (selected) document.getElementById('file-label').textContent = selected.name;
    });

    window.ContactSena?.autocomplete?.({ input: campaignSearch, hidden: campaignSearchId, list: document.getElementById('campaign-search-suggestions'), items: () => campanasDisponibles, text: campana => `${campana.id} - ${campana.name}`, value: campana => campana.id, onSelect: () => filtrarCampanas() });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const inicio = document.getElementById('campaign-start').value;
        const fin = document.getElementById('campaign-end').value;
        if (inicio < fechaActual()) {
            alert('La fecha de inicio no puede ser anterior a hoy.');
            document.getElementById('campaign-start').focus();
            return;
        }
        if (fin < fechaActual()) {
            alert('La fecha de fin no puede ser anterior a hoy.');
            fechaFinInput.focus();
            return;
        }
        if (!Validaciones.rangoFechasValido(inicio, fin)) {
            alert('La fecha final no puede ser anterior a la fecha de inicio.');
            document.getElementById('campaign-end').focus();
            return;
        }
        if (!asignadas.size) {
            if (assignmentError) assignmentError.hidden = false;
            document.getElementById('open-typification-assignment')?.focus();
            return;
        }
        const formData = new FormData();
        formData.append('name', document.getElementById('campaign-name').value.trim());
        formData.append('startDate', inicio);
        formData.append('endDate', fin);
        formData.append('typifications', JSON.stringify([...asignadas]));
        if (file.files[0]) formData.append('file', file.files[0]);
        try {
            const response = await fetch(editingId ? `/api/campanas/${editingId}` : '/api/campanas', { method: editingId ? 'PATCH' : 'POST', body: formData });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la campaña');
            close();
            reiniciar();
            await cargarCampanas();
        } catch (error) { alert(error.message); }
    });

    document.getElementById('campaign-start').min = fechaActual();
    Promise.all([cargarTipificaciones(), cargarCampanas()])
        .then(() => { renderizarTipificaciones(); })
        .catch(error => console.error(error));
});
