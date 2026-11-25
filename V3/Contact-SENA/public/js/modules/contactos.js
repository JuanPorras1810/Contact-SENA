document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalPrimerContacto');
    const button = document.getElementById('btn-nuevo-contacto');
    const filasAsignadas = document.getElementById('assigned-clients-rows');
    const assignedSearchType = document.getElementById('assigned-contact-search-type');
    const assignedSearchInput = document.getElementById('assigned-contact-search-input');
    const assignedSearchClear = document.getElementById('assigned-contact-search-clear');
    const assignedSearchSuggestions = document.getElementById('assigned-contact-search-suggestions');
    const assignedSearchControl = document.getElementById('assigned-contact-search-control');
    let clientesAsignados = [];
    let interaccionesHoy = [];
    let selectedAssignedSearch = null;
    let clienteActual = null;
    let gestionIniciadaEn = null;
    let llamadaFinalizadaEn = null;
    let llamadaEnCurso = false;
    let relojLlamada = null;
    let telefonoLlamada = '';
    let telefonoSeguimiento = '';
    const fechaGestionHoy = document.getElementById('assigned-session-date');
    const fechaLocalHoy = () => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    };
    if (fechaGestionHoy) {
        const hoy = new Date();
        const fecha = new Intl.DateTimeFormat('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(hoy);
        fechaGestionHoy.textContent = `Gestión de Hoy: ${fecha.charAt(0).toLocaleUpperCase('es-CO')}${fecha.slice(1)}`;
    }
    if (!modal || !button) return;

    const detenerReloj = () => { if (relojLlamada) { clearInterval(relojLlamada); relojLlamada = null; } };
    const formatearDuracion = valor => {
        if (valor === null || valor === undefined || valor === '') return '—';
        const partes = String(valor).split(':');
        if (partes.length !== 3 || partes.some(parte => !/^\d+$/.test(parte))) return String(valor);
        return partes.map(parte => parte.padStart(2, '0')).join(':');
    };
    const formatearFechaTrace = valor => {
        if (!valor) return 'Fecha no disponible';
        const [year, month, day] = String(valor).slice(0, 10).split('-').map(Number);
        if (!year || !month || !day) return String(valor);
        return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(year, month - 1, day));
    };
    const resetearLlamada = () => {
        detenerReloj(); gestionIniciadaEn = null; llamadaFinalizadaEn = null; llamadaEnCurso = false;
        telefonoLlamada = '';
        const buttonCall = document.getElementById('btn-hacer-llamada');
        const save = document.getElementById('btn-guardar-contacto');
        const phoneChoice = document.getElementById('contact-phone-choice');
        if (phoneChoice) { phoneChoice.disabled = false; phoneChoice.value = 'primary'; actualizarTarjetasTelefono(phoneChoice); }
        if (buttonCall) { buttonCall.disabled = false; buttonCall.classList.remove('is-running', 'is-complete'); buttonCall.textContent = '☎ Hacer llamada'; }
        if (save) save.disabled = true;
        setText('call-simulator-timer', '00:00:00');
        setText('call-simulator-status', `Listo para marcar al ${clienteActual?.phone || 'número no registrado'}`);
        document.querySelector('#modalPrimerContacto .call-status-dot')?.classList.remove('calling', 'finished');
    };
    const close = () => { resetearLlamada(); modal.classList.remove('show'); };
    const setText = (id, value, fallback = '-') => { const element = document.getElementById(id); if (element) element.textContent = value || fallback; };
    const ubicacionCliente = cliente => [cliente.address, cliente.neighborhood, cliente.municipality, cliente.department].filter(value => value && String(value).trim()).join(', ') || 'Sin ubicación registrada';
    const configurarTelefonos = (select, principal, secundario) => {
        if (!select) return;
        const optionPrincipal = select.querySelector('option[value="primary"]');
        const optionSecundario = select.querySelector('option[value="secondary"]');
        optionPrincipal.textContent = `Principal: ${principal || 'No registrado'}`;
        optionPrincipal.disabled = !principal;
        optionSecundario.textContent = secundario ? `Secundario: ${secundario}` : 'Secundario: No registrado';
        optionSecundario.disabled = !secundario;
        select.value = principal ? 'primary' : secundario ? 'secondary' : 'primary';
        select.disabled = false;
        actualizarTarjetasTelefono(select);
    };
    const actualizarTarjetasTelefono = select => {
        if (!select) return;
        document.querySelectorAll(`[data-phone-select="${select.id}"]`).forEach(card => {
            const value = card.dataset.phoneValue;
            const option = select.querySelector(`option[value="${value}"]`);
            const number = card.querySelector('.phone-line-number');
            if (number && option) number.textContent = option.textContent.replace(/^(Principal|Secundario):\s*/i, '');
            card.classList.toggle('selected', select.value === value);
            card.disabled = Boolean(select.disabled || option?.disabled);
        });
    };
    document.querySelectorAll('.phone-line-card').forEach(card => card.addEventListener('click', () => {
        const select = document.getElementById(card.dataset.phoneSelect);
        if (!select || select.disabled || card.disabled) return;
        select.value = card.dataset.phoneValue;
        actualizarTarjetasTelefono(select);
        const phone = select.value === 'secondary' ? clienteActual?.phoneAlt || activeCase?.phoneAlt : clienteActual?.phone || activeCase?.phone;
        setText(select.id === 'contact-phone-choice' ? 'call-simulator-status' : 'followup-call-status', `Listo para marcar al ${phone || 'número no registrado'}`);
    }));
    const numeroSeleccionado = (select, principal, secundario) => select?.value === 'secondary' ? secundario || '' : principal || '';
    const localParts = value => { const pad = item => String(item).padStart(2, '0'); return { date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`, time: `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}` }; };
    const setContactTimes = (start, end = new Date()) => { const startParts = localParts(start); const endParts = localParts(end); document.getElementById('contact-start-date').value = startParts.date; document.getElementById('contact-start-time').value = startParts.time; document.getElementById('contact-end-date').value = endParts.date; document.getElementById('contact-end-time').value = endParts.time; };
    const elapsedTime = (start, end = new Date()) => { const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime(); const endMs = end instanceof Date ? end.getTime() : new Date(end).getTime(); const seconds = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, Math.floor((endMs - startMs) / 1000)) : 0; return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
    const establecerOpciones = (selector, elementos) => { if (selector) selector.replaceChildren(new Option('Seleccione...', '')); (elementos || []).forEach(elemento => selector.appendChild(new Option(elemento.name, elemento.id))); };
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const etiquetaCliente = elemento => {
        const id = elemento.clientId ?? elemento.client?.id;
        const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name);
        if (id === undefined || id === null || id === '') return nombre || 'Cliente';
        return `Cliente #${id}${nombre ? ` - ${nombre}` : ''}`;
    };
    const marcarCliente = elemento => { const id = elemento.clientId ?? elemento.client?.id; const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name); if (id === undefined || id === null || id === '') return escaparHtml(nombre || 'Cliente'); return `<span class="client-reference"><strong>Cliente #${escaparHtml(id)}</strong>${nombre ? `<small>${escaparHtml(nombre)}</small>` : ''}</span>`; };
    const claseEstado = estado => {
        const normalizado = String(estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizado === 'efectivo') return 'estado-resuelto';
        if (normalizado === 'en proceso') return 'estado-pendiente';
        return 'estado-sin-gestion';
    };
    const claseResultadoTraza = estado => {
        const normalizado = String(estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizado === 'efectivo') return 'history-result-effective';
        if (normalizado === 'en proceso') return 'history-result-progress';
        return 'history-result-unmanaged';
    };
    const renderizarContactos = () => {
        if (!filasAsignadas) return;
        const clientesAsignadosHoy = clientesAsignados.filter(cliente => String(cliente.assignmentDate || '').slice(0, 10) === fechaLocalHoy());
        const criterio = assignedSearchType?.value || 'code';
        const termino = String(assignedSearchInput?.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/^#/, '');
        const filtrar = (registros, tipo) => registros.filter(item => {
            const codigo = String(tipo === 'interaction' ? item.id : item.assignmentId);
            const clienteId = String(tipo === 'interaction' ? item.clientId : item.id);
            const nombreCliente = String(tipo === 'interaction' ? item.clientName : item.name);
            const campaignId = String(item.campaignId ?? '');
            const campaignName = String(item.campaign ?? '');
            if (selectedAssignedSearch) {
                if (selectedAssignedSearch.type === 'code') return selectedAssignedSearch.kind === tipo && codigo === selectedAssignedSearch.id;
                if (selectedAssignedSearch.type === 'client') return clienteId === selectedAssignedSearch.id;
                return selectedAssignedSearch.id
                    ? campaignId === selectedAssignedSearch.id
                    : campaignName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es') === selectedAssignedSearch.name;
            }
            if (!termino) return true;
            if (criterio === 'code') return codigo.includes(termino);
            if (criterio === 'campaign') return `${campaignId} ${campaignName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(termino);
            return `${clienteId} ${nombreCliente}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(termino);
        });
        const interaccionesVisibles = filtrar(interaccionesHoy, 'interaction');
        const clientesVisibles = filtrar(clientesAsignadosHoy, 'assignment');
        filasAsignadas.replaceChildren();
        if (!clientesAsignadosHoy.length && !interaccionesHoy.length) {
            filasAsignadas.innerHTML = '<tr><td colspan="7" class="empty-assigned-clients">No hay contactos asignados pendientes.</td></tr>';
            return;
        }
        if (!interaccionesVisibles.length && !clientesVisibles.length) {
            filasAsignadas.innerHTML = '<tr><td colspan="7" class="empty-assigned-clients">No hay contactos que coincidan con la búsqueda.</td></tr>';
            return;
        }
        interaccionesVisibles.forEach(elemento => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><span class="contact-code">#${escaparHtml(elemento.id)}</span></td><td class="col-cliente">${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign)}</span></td><td>${escaparHtml(elemento.typification)}</td><td>${escaparHtml(elemento.observation)}</td><td><div class="time-box"><span>${escaparHtml(formatearDuracion(elemento.duration))}</span></div></td><td><span class="col-estado ${claseEstado(elemento.status)}">${escaparHtml(elemento.status || 'Sin gestión')}</span></td>`;
            filasAsignadas.appendChild(fila);
        });
        clientesVisibles.forEach(cliente => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><span class="contact-code">#${escaparHtml(cliente.assignmentId)}</span></td><td class="col-cliente">${marcarCliente({clientId: cliente.id, clientName: cliente.name})}</td><td><span class="col-campana">${escaparHtml(cliente.campaign)}</span></td><td>${escaparHtml(cliente.typification || 'Sin tipificación')}</td><td>${escaparHtml(cliente.lastInteractionObservation || cliente.observation || '')}</td><td><div class="time-box"><span>${escaparHtml(formatearDuracion(cliente.duration))}</span></div></td><td><span class="col-estado estado-sin-gestion">Sin gestión</span></td>`;
            filasAsignadas.appendChild(fila);
        });
    };
    const ocultarSugerenciasAsignadas = () => {
        if (assignedSearchSuggestions) assignedSearchSuggestions.hidden = true;
        assignedSearchInput?.setAttribute('aria-expanded', 'false');
    };
    const mostrarSugerenciasAsignadas = () => {
        if (!assignedSearchInput || !assignedSearchSuggestions) return;
        const criterio = assignedSearchType?.value || 'code';
        const termino = assignedSearchInput.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/^#/, '');
        const opciones = new Map();
        const agregar = (item, kind) => {
            const codigo = String(kind === 'interaction' ? item.id : item.assignmentId);
            const clienteId = String(kind === 'interaction' ? item.clientId : item.id);
            const nombre = String(kind === 'interaction' ? item.clientName : item.name);
            const campanaId = String(item.campaignId ?? '');
            const campana = String(item.campaign ?? '');
            let key; let label; let selection;
            if (criterio === 'code') {
                key = `${kind}-${codigo}`;
                label = `${kind === 'interaction' ? 'Gestión' : 'Asignación'} #${codigo} · ${nombre || 'Cliente'}`;
                selection = { type: 'code', kind, id: codigo };
            } else if (criterio === 'client') {
                key = clienteId;
                label = `Cliente #${clienteId} - ${nombre || 'Cliente'}`;
                selection = { type: 'client', id: clienteId };
            } else {
                key = campanaId || campana.toLowerCase();
                label = campanaId ? `${campanaId} - ${campana || 'Campaña'}` : campana;
                selection = { type: 'campaign', id: campanaId, name: campana.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es') };
            }
            const textoOpcion = criterio === 'code' ? `${codigo} ${nombre}` : criterio === 'client' ? `${clienteId} ${nombre}` : `${campanaId} ${campana}`;
            if (!key || (termino && !textoOpcion.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(termino))) return;
            if (!opciones.has(key)) opciones.set(key, { label, selection });
        };
        interaccionesHoy.forEach(item => agregar(item, 'interaction'));
        clientesAsignados.filter(item => String(item.assignmentDate || '').slice(0, 10) === fechaLocalHoy()).forEach(item => agregar(item, 'assignment'));
        assignedSearchSuggestions.replaceChildren();
        [...opciones.values()].slice(0, 12).forEach(opcion => {
            const suggestion = document.createElement('button');
            suggestion.type = 'button';
            suggestion.className = 'client-search-suggestion';
            suggestion.setAttribute('role', 'option');
            suggestion.textContent = opcion.label;
            suggestion.addEventListener('click', () => {
                selectedAssignedSearch = opcion.selection;
                assignedSearchInput.value = opcion.label;
                if (assignedSearchClear) assignedSearchClear.hidden = false;
                ocultarSugerenciasAsignadas();
                renderizarContactos();
            });
            assignedSearchSuggestions.appendChild(suggestion);
        });
        if (!assignedSearchSuggestions.children.length && termino) {
            const empty = document.createElement('div');
            empty.className = 'client-search-suggestion client-search-no-results';
            empty.textContent = 'Sin coincidencias...';
            assignedSearchSuggestions.appendChild(empty);
        }
        assignedSearchSuggestions.hidden = !assignedSearchSuggestions.children.length;
        assignedSearchInput.setAttribute('aria-expanded', String(!assignedSearchSuggestions.hidden));
    };
    assignedSearchInput?.addEventListener('focus', mostrarSugerenciasAsignadas);
    assignedSearchInput?.addEventListener('input', () => {
        selectedAssignedSearch = null;
        if (assignedSearchClear) assignedSearchClear.hidden = !assignedSearchInput.value;
        renderizarContactos();
        mostrarSugerenciasAsignadas();
    });
    assignedSearchType?.addEventListener('change', () => {
        selectedAssignedSearch = null;
        if (assignedSearchInput) {
            assignedSearchInput.value = '';
            assignedSearchInput.placeholder = assignedSearchType.value === 'code'
                ? 'Buscar por código...'
                : assignedSearchType.value === 'campaign'
                    ? 'Buscar campaña por código o nombre...'
                    : 'Buscar cliente por nombre...';
        }
        if (assignedSearchClear) assignedSearchClear.hidden = true;
        renderizarContactos();
        assignedSearchInput?.focus();
        mostrarSugerenciasAsignadas();
    });
    assignedSearchClear?.addEventListener('click', () => {
        selectedAssignedSearch = null;
        if (assignedSearchInput) {
            assignedSearchInput.value = '';
            assignedSearchInput.focus();
        }
        assignedSearchClear.hidden = true;
        renderizarContactos();
        ocultarSugerenciasAsignadas();
    });
    document.addEventListener('click', event => {
        if (assignedSearchControl && !assignedSearchControl.contains(event.target)) ocultarSugerenciasAsignadas();
    });
    const cargarInteraccionesHoy = async () => {
        if (!filasAsignadas) return;
        try {
            const respuesta = await fetch('/api/interacciones/hoy');
            if (!respuesta.ok) throw new Error('No se pudieron cargar las interacciones de hoy');
            const datosRespuesta = await respuesta.json();
            interaccionesHoy = datosRespuesta.data || [];
            renderizarContactos();
        } catch (error) { console.error(error); }
    };
    const cargarCatalogos = async idCampana => {
        const respuesta = await fetch(`/api/interacciones/catalogos?campaignId=${encodeURIComponent(idCampana)}`);
        if (!respuesta.ok) throw new Error('No se pudieron cargar los catálogos de la gestión');
        const datos = await respuesta.json();
         establecerOpciones(document.getElementById('contact-typification'), datos.typifications);
         establecerOpciones(document.getElementById('select-cierre-caso'), datos.statuses);
         updateTicketBox();
    };
    const abrirParaCliente = async cliente => {
        if (!cliente) { alert('No tienes clientes asignados para gestionar.'); return; }
        clienteActual = cliente;
          resetearLlamada();
        setText('contact-client-id', cliente.id !== undefined && cliente.id !== null && cliente.id !== '' ? `#${cliente.id}` : 'Sin ID');
        setText('contact-client-name', cliente.name, 'No registrado');
        setText('contact-client-phone', cliente.phone);
        setText('contact-client-phone-alt', cliente.phoneAlt, 'No registrado');
        setText('contact-client-email', cliente.email, 'No registrado');
        setText('contact-client-address', ubicacionCliente(cliente), 'Sin ubicación registrada');
        setText('contact-client-observation', cliente.observation, 'Sin observaciones registradas.');
        const campaignCard = document.getElementById('contact-campaign-card');
        if (campaignCard) campaignCard.dataset.campaign = cliente.campaign || '';
        setText('contact-campaign-name', cliente.campaign, 'Sin campaña');
        configurarTelefonos(document.getElementById('contact-phone-choice'), cliente.phone, cliente.phoneAlt);
        const pdfButton = document.getElementById('open-contact-campaign-pdf');
        if (pdfButton) { pdfButton.hidden = !cliente.campaignPdf; pdfButton.disabled = false; pdfButton.onclick = () => { if (cliente.campaignPdf) window.open(cliente.campaignPdf, '_blank', 'noopener'); }; }
        try { await cargarCatalogos(cliente.campaignId); } catch (error) { alert(error.message); return; }
         modal.classList.add('show');
    };

    document.getElementById('btn-hacer-llamada')?.addEventListener('click', () => {
        const buttonCall = document.getElementById('btn-hacer-llamada');
        const save = document.getElementById('btn-guardar-contacto');
        if (!gestionIniciadaEn) {
            const phoneChoice = document.getElementById('contact-phone-choice');
            telefonoLlamada = numeroSeleccionado(phoneChoice, clienteActual?.phone, clienteActual?.phoneAlt);
            gestionIniciadaEn = new Date();
            llamadaEnCurso = true;
            if (phoneChoice) { phoneChoice.disabled = true; actualizarTarjetasTelefono(phoneChoice); }
            setContactTimes(gestionIniciadaEn, gestionIniciadaEn);
            if (buttonCall) { buttonCall.classList.add('is-running'); buttonCall.classList.remove('is-complete'); buttonCall.textContent = '☎ Finalizar llamada'; }
            if (save) save.disabled = true;
            setText('call-simulator-status', `Llamando al ${telefonoLlamada || 'número no registrado'}...`);
            document.querySelector('#modalPrimerContacto .call-status-dot')?.classList.add('calling');
            relojLlamada = setInterval(() => setText('call-simulator-timer', elapsedTime(gestionIniciadaEn)), 1000);
            return;
        }
        if (!llamadaEnCurso) return;
        llamadaFinalizadaEn = new Date();
        llamadaEnCurso = false;
        detenerReloj();
        setContactTimes(gestionIniciadaEn, llamadaFinalizadaEn);
        setText('call-simulator-timer', elapsedTime(gestionIniciadaEn, llamadaFinalizadaEn));
        if (buttonCall) { buttonCall.disabled = true; buttonCall.classList.remove('is-running'); buttonCall.classList.add('is-complete'); buttonCall.textContent = '✓ Llamada finalizada'; }
        if (save) save.disabled = false;
        const phoneChoice = document.getElementById('contact-phone-choice');
         if (phoneChoice) { phoneChoice.disabled = true; actualizarTarjetasTelefono(phoneChoice); }
        setText('call-simulator-status', `Llamada finalizada (${telefonoLlamada || 'número no registrado'}) • Duración: ${elapsedTime(gestionIniciadaEn, llamadaFinalizadaEn)}`);
        document.querySelector('#modalPrimerContacto .call-status-dot')?.classList.remove('calling');
        document.querySelector('#modalPrimerContacto .call-status-dot')?.classList.add('finished');
    });

    const cargarClientesAsignados = async () => {
        const user = await window.ContactSena?.ready.then(() => window.ContactSena.user).catch(() => null);
        if (!user?.id || user.role !== 'agente') { clientesAsignados = []; return; }
        try {
            const respuesta = await fetch(`/api/clientes/asignados?agentId=${encodeURIComponent(user.id)}`);
            if (!respuesta.ok) throw new Error('No se pudieron cargar los clientes asignados');
            const datosRespuesta = await respuesta.json();
            clientesAsignados = (datosRespuesta.data || []).filter(cliente => cliente.attended === false || cliente.attended === 0 || cliente.attended === '0' || cliente.attended === null || cliente.attended === undefined);
            if (filasAsignadas) {
                renderizarContactos();
            }
        } catch (error) { clientesAsignados = []; console.error(error); }
    };

    button.addEventListener('click', async () => {
        await cargarClientesAsignados();
        abrirParaCliente(clientesAsignados.find(cliente => !cliente.attended) || clientesAsignados[0]);
    });
    document.getElementById('close-contacto-x')?.addEventListener('click', close);
    document.getElementById('btn-descartar-contacto')?.addEventListener('click', close);
    const select = document.getElementById('select-cierre-caso');
    const evaluate = () => { if (!select) return; select.classList.toggle('select-dinamico-status', Boolean(select.value)); };
    select?.addEventListener('change', evaluate); evaluate();
    const ticketBox = document.getElementById('box-ticket-seguimiento');
      const updateTicketBox = () => {
          if (!select || !ticketBox) return;
          const status = select.options[select.selectedIndex]?.text.toLowerCase().trim();
          const requiresCase = status === 'en proceso' || status === 'sin gestión';
          ticketBox.classList.toggle('d-none', !requiresCase);
          const scheduleFields = document.getElementById('case-followup-schedule');
          if (scheduleFields) scheduleFields.hidden = status !== 'en proceso';
      };
    select?.addEventListener('change', updateTicketBox); updateTicketBox();
    document.querySelectorAll('.col-estado').forEach(status => { const value = status.textContent.trim().toLowerCase(); status.classList.toggle('estado-pendiente', value === 'en proceso' || value === 'sin gestión'); status.classList.toggle('estado-resuelto', value === 'efectivo'); });
    document.getElementById('contact-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const user = window.ContactSena?.user || null;
         if (!gestionIniciadaEn) { alert('Primero debes presionar “Hacer llamada”.'); return; }
         if (llamadaEnCurso || !llamadaFinalizadaEn) { alert('Finaliza la llamada antes de guardar la gestión.'); return; }
         const contactEndedAt = llamadaFinalizadaEn;
        setContactTimes(gestionIniciadaEn || contactEndedAt, contactEndedAt);
        const partesInicio = localParts(gestionIniciadaEn || contactEndedAt);
        const partesFin = localParts(contactEndedAt);
          const selectedStatus = select?.options[select.selectedIndex]?.text.toLowerCase().trim();
          const scheduleRequired = selectedStatus === 'en proceso';
          const scheduledDate = document.getElementById('contact-followup-date')?.value;
          const scheduledTime = document.getElementById('contact-followup-time')?.value;
           const cuerpo = { assignmentId: clienteActual?.assignmentId, agentId: user?.id, typificationId: document.getElementById('contact-typification')?.value, statusId: document.getElementById('select-cierre-caso')?.value, reason: document.getElementById('contact-campaign-card')?.dataset.campaign || '', observation: document.getElementById('contact-observation')?.value.trim(), followupAt: scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}:00` : null, date: partesInicio.date, startTime: partesInicio.time, endTime: partesFin.time, duration: elapsedTime(gestionIniciadaEn, contactEndedAt) };
         if (!['efectivo', 'en proceso', 'sin gestión'].includes(selectedStatus)) {
             alert('Selecciona un resultado válido para la gestión.');
             return;
         }
           if (scheduleRequired && !cuerpo.followupAt) { alert('Indica la fecha y hora de rellamada.'); return; }
         const saveButton = document.getElementById('btn-guardar-contacto');
         if (saveButton?.disabled) return;
         if (saveButton) saveButton.disabled = true;
         try {
            const respuesta = await fetch('/api/interacciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
            const datosRespuesta = await respuesta.json();
            if (!respuesta.ok) throw new Error(datosRespuesta.error || 'No se pudo guardar la gestión');
            form.reset();
            close();
            await cargarClientesAsignados();
            await cargarInteraccionesHoy();
            alert(datosRespuesta.data.caseCreated ? 'Gestión y caso guardados correctamente.' : 'Gestión guardada correctamente.');
         } catch (error) { if (saveButton) saveButton.disabled = false; alert(error.message); }
    });
      const casesBody = document.getElementById('case-rows');
      const notificationCount = document.getElementById('contact-notification-count');
      const notificationItems = document.querySelector('.contact-notification-items');
      const notificationDropdown = document.getElementById('contact-notification-list');
      const notificationButton = document.getElementById('contact-notification-button');
      const casesSearchType = document.getElementById('cases-search-type');
      const casesSearchInput = document.getElementById('cases-search-input');
      const casesSearchClear = document.getElementById('cases-search-clear');
      const casesSearchSuggestions = document.getElementById('cases-search-suggestions');
      const casesSearchControl = document.getElementById('cases-search-control');
      let casesData = [];
      let selectedCaseSearch = null;
      const fechaLocalCaso = value => {
          if (!value) return null;
          if (value instanceof Date) return value;
          const texto = String(value);
          return new Date(texto.includes('T') ? texto : texto.replace(' ', 'T'));
      };
      const casoListoParaLlamar = item => {
          if (!item.followupAt) return true;
          const alarma = fechaLocalCaso(item.followupAt);
          return Boolean(alarma && !Number.isNaN(alarma.getTime()) && alarma.getTime() <= Date.now());
      };
      const formatoAlarmaCaso = value => {
          const alarma = fechaLocalCaso(value);
          return !alarma || Number.isNaN(alarma.getTime())
              ? 'Sin hora programada'
              : alarma.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
      };
      const normalizarBusquedaCaso = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
      const casosFiltrados = () => {
          const criterio = casesSearchType?.value || 'client';
          const termino = normalizarBusquedaCaso(casesSearchInput?.value).replace(/^#/, '');
          return casesData.filter(item => {
              if (selectedCaseSearch) {
                  if (selectedCaseSearch.type === 'code') return String(item.id) === selectedCaseSearch.id;
                  if (selectedCaseSearch.type === 'client') return String(item.clientId) === selectedCaseSearch.id;
                  return selectedCaseSearch.id
                      ? String(item.campaignId) === selectedCaseSearch.id
                      : normalizarBusquedaCaso(item.campaign) === selectedCaseSearch.name;
              }
              if (!termino) return true;
              if (criterio === 'code') return String(item.id).includes(termino);
              if (criterio === 'campaign') return normalizarBusquedaCaso(item.campaign).includes(termino) || String(item.campaignId ?? '').includes(termino);
              return normalizarBusquedaCaso(item.clientName).includes(termino) || String(item.clientId ?? '').includes(termino);
          });
      };
      const renderizarTarjetasCasos = () => {
          const casosVisibles = casosFiltrados();
          casesBody.innerHTML = casosVisibles.map(item => {
              const ready = casoListoParaLlamar(item);
              const closed = item.closed === true || item.closed === 1 || item.closed === '1';
              return `<article class="case-card ${ready ? 'tarjetaCasoHabilitada' : 'tarjetaCasoBloqueada'}" data-case-id="${escaparHtml(item.id)}">
                  <div>
                      <div class="case-card-top">
                          <span class="case-status-pill ${ready ? 'case-status-ready' : 'case-status-waiting'}">● ${ready ? 'Listo para rellamar' : 'En espera de hora'}</span>
                          <button type="button" class="case-call-button" data-case-call="${escaparHtml(item.id)}" ${ready ? '' : 'disabled'}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              ${ready ? 'Llamar' : 'Bloqueado'}
                          </button>
                      </div>
                      <div class="case-card-subtitle">CASO #${escaparHtml(item.id)} · ${escaparHtml(item.campaign || 'Sin campaña')}</div>
                      <h4 class="case-card-client">${escaparHtml(item.clientName || 'Cliente')}</h4>
                      <div class="case-card-alarm"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg><span>Alarma: ${escaparHtml(formatoAlarmaCaso(item.followupAt))}</span></div>
                      <div class="case-card-observation">${escaparHtml(item.observation || 'Sin observaciones registradas.')}</div>
                  </div>
                  <footer class="case-card-footer"><span><strong>ID #${escaparHtml(item.clientId)}</strong> · Tel: ${escaparHtml(item.phone || 'Sin teléfono')}</span><span>Cerrado: <strong>${closed ? 'Sí' : 'No'}</strong></span></footer>
              </article>`;
          }).join('') || '<p class="case-card-empty">No hay casos que coincidan con la búsqueda.</p>';
          casesBody.querySelectorAll('[data-case-call]').forEach(callButton => callButton.addEventListener('click', () => {
              if (callButton.disabled) return;
              const item = casesData.find(caso => String(caso.id) === callButton.dataset.caseCall);
              if (item) openFollowup(item);
          }));
      };
      const ocultarSugerenciasCasos = () => {
          if (casesSearchSuggestions) casesSearchSuggestions.hidden = true;
          casesSearchInput?.setAttribute('aria-expanded', 'false');
      };
      const mostrarSugerenciasCasos = () => {
          if (!casesSearchInput || !casesSearchSuggestions) return;
          const type = casesSearchType?.value || 'client';
          const termino = normalizarBusquedaCaso(casesSearchInput.value).replace(/^#/, '');
          const opciones = new Map();
          casesData.forEach(item => {
              let id;
              let name = '';
              let label;
              if (type === 'code') {
                  id = String(item.id);
                  label = `Caso #${id} · ${item.clientName || 'Cliente'}`;
              } else if (type === 'campaign') {
                  id = String(item.campaignId ?? '');
                  name = normalizarBusquedaCaso(item.campaign);
                  label = id ? `${id} - ${item.campaign || 'Campaña'}` : String(item.campaign || 'Campaña');
              } else {
                  id = String(item.clientId ?? '');
                  label = `#${id} - ${item.clientName || 'Cliente'}`;
              }
              const target = type === 'campaign' ? `${id} ${item.campaign}` : `${id} ${item.clientName}`;
              if (!id || (termino && !normalizarBusquedaCaso(target).replace(/^#/, '').includes(termino))) return;
              const key = type === 'campaign' && !item.campaignId ? name : id;
              if (!opciones.has(key)) opciones.set(key, { id, name, label });
          });
          casesSearchSuggestions.replaceChildren();
          [...opciones.values()].slice(0, 12).forEach(opcion => {
              const suggestion = document.createElement('button');
              suggestion.type = 'button';
              suggestion.className = 'client-search-suggestion';
              suggestion.setAttribute('role', 'option');
              suggestion.textContent = opcion.label;
              suggestion.addEventListener('click', () => {
                  selectedCaseSearch = { type, id: opcion.id, name: opcion.name };
                  casesSearchInput.value = opcion.label;
                  if (casesSearchClear) casesSearchClear.hidden = false;
                  ocultarSugerenciasCasos();
                  renderizarTarjetasCasos();
              });
              casesSearchSuggestions.appendChild(suggestion);
          });
          if (!casesSearchSuggestions.children.length && termino) {
              const empty = document.createElement('div');
              empty.className = 'client-search-suggestion client-search-no-results';
              empty.textContent = 'Sin coincidencias...';
              casesSearchSuggestions.appendChild(empty);
          }
          casesSearchSuggestions.hidden = !casesSearchSuggestions.children.length;
          casesSearchInput.setAttribute('aria-expanded', String(!casesSearchSuggestions.hidden));
      };
      const loadCases = async () => {
          if (!casesBody) return;
          const response = await fetch('/api/interacciones/casos');
          if (!response.ok) throw new Error('No se pudieron cargar los casos');
          const payload = await response.json();
          const cases = payload.data || [];
          casesData = cases;
          const clock = document.getElementById('cases-current-clock');
          if (clock) clock.textContent = `Hora actual del sistema: ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
          renderizarTarjetasCasos();
          const dueCases = cases.filter(item => item.closed !== true && item.closed !== 1 && item.closed !== '1' && casoListoParaLlamar(item));
          if (notificationCount) {
              notificationCount.textContent = String(dueCases.length);
              notificationCount.hidden = !dueCases.length;
          }
          if (notificationItems) {
              notificationItems.replaceChildren();
              if (!dueCases.length) {
                  const empty = document.createElement('p');
                  empty.className = 'contact-notification-empty';
                  empty.textContent = 'No hay casos listos para rellamar.';
                  notificationItems.appendChild(empty);
              } else {
                  dueCases.forEach(item => {
                      const entry = document.createElement('button');
                      entry.type = 'button';
                      entry.className = 'contact-notification-item';
                      const customer = document.createElement('strong');
                      customer.textContent = item.clientName || 'Cliente';
                      const details = document.createElement('span');
                      details.textContent = `${item.phone || 'Sin teléfono'} · ${item.campaign || 'Sin campaña'} · ${item.followupAt}`;
                      entry.append(customer, details);
                      entry.addEventListener('click', () => {
                          if (notificationDropdown) notificationDropdown.hidden = true;
                          notificationButton?.setAttribute('aria-expanded', 'false');
                          openFollowup(item);
                      });
                      notificationItems.appendChild(entry);
                  });
              }
          }
      };
      let activeCase = null; let followupStarted = null; let followupEnded = null; let followupTicker = null;
      const openFollowup = async item => {
          if (!casoListoParaLlamar(item)) return;
          activeCase = item; followupStarted = null; followupEnded = null;
          telefonoSeguimiento = '';
          const followupCallButton = document.getElementById('btn-hacer-llamada-seguimiento');
          followupCallButton.disabled = false;
          followupCallButton.classList.remove('is-running', 'is-complete');
          followupCallButton.textContent = '☎ Hacer llamada';
           document.getElementById('followup-phone-choice').disabled = true;
          setText('followup-case-id', `#${item.id}`);
           setText('followup-client-id', item.clientId !== undefined && item.clientId !== null && item.clientId !== '' ? `#${item.clientId}` : 'Sin ID');
          setText('followup-client-name', item.clientName, 'No registrado');
          setText('followup-client-phone', item.phone);
          setText('followup-client-phone-alt', item.phoneAlt, 'No registrado');
          setText('followup-client-email', item.email, 'No registrado');
          setText('followup-client-address', ubicacionCliente({ address: item.address, neighborhood: item.neighborhood, municipality: item.municipality, department: item.department }), 'Sin ubicación registrada');
          setText('followup-client-observation', item.clientObservation, 'Sin observaciones registradas.');
          setText('followup-campaign', item.campaign, 'Sin campaña');
          document.getElementById('followup-campaign-card').dataset.campaign = item.campaign || '';
          setText('followup-alarm', item.followupAt);
          configurarTelefonos(document.getElementById('followup-phone-choice'), item.phone, item.phoneAlt);
          const followupPdfButton = document.getElementById('open-followup-campaign-pdf');
          followupPdfButton.hidden = !item.campaignPdf;
          followupPdfButton.disabled = false;
          followupPdfButton.onclick = () => { if (item.campaignPdf) window.open(item.campaignPdf, '_blank', 'noopener'); };
           setText('followup-call-status', `Listo para marcar al ${item.phone || 'número no registrado'}`);
           document.querySelector('#modalSeguimientoCaso .call-status-dot')?.classList.remove('calling', 'finished');
          setText('followup-timer', '00:00:00');
          const cat = await fetch(`/api/interacciones/catalogos?campaignId=${encodeURIComponent(item.campaignId)}`).then(r => r.json());
          establecerOpciones(document.getElementById('followup-typification'), cat.typifications); establecerOpciones(document.getElementById('followup-status'), cat.statuses);
          const followupSchedule = document.getElementById('followup-schedule');
          const followupDate = document.getElementById('followup-date');
          const followupTime = document.getElementById('followup-time');
          followupDate.value = '';
          followupDate.min = localParts(new Date()).date;
          followupTime.value = '';
          followupDate.readOnly = false;
          followupTime.readOnly = false;
          document.getElementById('followup-schedule-title').textContent = 'Programar próximo contacto';
          document.getElementById('followup-schedule-description').textContent = 'Selecciona la fecha y la hora para volver a contactar.';
          followupSchedule.hidden = true;
          followupDate.required = false;
          followupTime.required = false;
          const traceContainer = document.getElementById('followup-trace');
          traceContainer.innerHTML = '<p class="followup-trace-empty">Cargando interacciones...</p>';
          try {
              const traceResponse = await fetch(`/api/interacciones/cliente/${encodeURIComponent(item.clientId)}/trazabilidad`);
              if (!traceResponse.ok) throw new Error('No se pudo cargar la trazabilidad');
              const trace = await traceResponse.json();
              const calls = (trace.data || []).slice().sort((a, b) => {
                  const left = `${String(a.date || '').slice(0, 10)} ${String(a.startTime || '')}`;
                  const right = `${String(b.date || '').slice(0, 10)} ${String(b.startTime || '')}`;
                  return left.localeCompare(right) || Number(a.id || 0) - Number(b.id || 0);
              });
                traceContainer.innerHTML = calls.map((call, index) => `<article class="followup-trace-card">
                   <div class="followup-trace-card-heading">
                       <span class="followup-trace-index">INTERACCIÓN #${index + 1}</span>
                       <time><svg class="followup-trace-calendar" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>${escaparHtml(formatearFechaTrace(call.date))}</time>
                  </div>
                  <div class="followup-trace-card-meta">
                      <span><small>Inicio</small><strong>${escaparHtml(call.startTime || '—')}</strong></span>
                      <span><small>Cierre</small><strong>${escaparHtml(call.endTime || '—')}</strong></span>
                    <span><small>Duración</small><strong class="followup-trace-duration">${escaparHtml(formatearDuracion(call.duration))}</strong></span>
                    <span><small>Tipificación</small><strong class="followup-trace-nowrap">${escaparHtml(call.typification || '—')}</strong></span>
                    <span><small>Resultado</small><strong><span class="history-result ${claseResultadoTraza(call.status)}">${escaparHtml(call.status || '—')}</span></strong></span>
                    <span><small>Asesor</small><strong>${escaparHtml(call.agent || '—')}</strong></span>
                  </div>
                   <div class="followup-trace-observation"><small>OBSERVACIÓN DE LA GESTIÓN</small><p>${escaparHtml(call.observation || 'Sin observaciones registradas.')}</p></div>
              </article>`).join('') || '<p class="followup-trace-empty">Sin llamadas anteriores.</p>';
          } catch (error) {
              traceContainer.innerHTML = '<p class="followup-trace-empty">No se pudo cargar la trazabilidad.</p>';
              console.error(error);
          }
         document.getElementById('modalSeguimientoCaso').classList.add('show');
     };
       const changeTab = follow => {
            document.getElementById('assigned-contact-panel').classList.toggle('d-none', follow);
           document.getElementById('cases-panel').classList.toggle('d-none', !follow);
          document.getElementById('tab-contactos-asignados').classList.toggle('active', !follow);
          document.getElementById('tab-seguimiento-casos').classList.toggle('active', follow);
          document.getElementById('tab-contactos-asignados').setAttribute('aria-selected', String(!follow));
          document.getElementById('tab-seguimiento-casos').setAttribute('aria-selected', String(follow));
        button.hidden = follow;
        const sessionBadgeRow = document.getElementById('assigned-session-row');
        if (sessionBadgeRow) sessionBadgeRow.hidden = follow;
          if (follow) loadCases().catch(console.error);
       };
       document.getElementById('tab-contactos-asignados')?.addEventListener('click', () => changeTab(false));
       document.getElementById('tab-seguimiento-casos')?.addEventListener('click', () => changeTab(true));
       casesSearchInput?.addEventListener('focus', mostrarSugerenciasCasos);
       casesSearchInput?.addEventListener('input', () => {
           selectedCaseSearch = null;
           if (casesSearchClear) casesSearchClear.hidden = !casesSearchInput.value;
           renderizarTarjetasCasos();
           mostrarSugerenciasCasos();
       });
       casesSearchType?.addEventListener('change', () => {
           selectedCaseSearch = null;
           if (casesSearchInput) {
               casesSearchInput.value = '';
               casesSearchInput.placeholder = casesSearchType.value === 'code'
                   ? 'Buscar caso por código...'
                   : casesSearchType.value === 'campaign'
                       ? 'Buscar campaña por código o nombre...'
                       : 'Buscar cliente por nombre...';
           }
           if (casesSearchClear) casesSearchClear.hidden = true;
           renderizarTarjetasCasos();
           casesSearchInput?.focus();
           mostrarSugerenciasCasos();
       });
       casesSearchClear?.addEventListener('click', () => {
           selectedCaseSearch = null;
           if (casesSearchInput) {
               casesSearchInput.value = '';
               casesSearchInput.focus();
           }
           casesSearchClear.hidden = true;
           renderizarTarjetasCasos();
           ocultarSugerenciasCasos();
       });
       document.addEventListener('click', event => {
           if (casesSearchControl && !casesSearchControl.contains(event.target)) ocultarSugerenciasCasos();
       });
       notificationButton?.addEventListener('click', () => {
          const isOpen = notificationDropdown?.hidden === false;
          if (notificationDropdown) notificationDropdown.hidden = isOpen;
          notificationButton.setAttribute('aria-expanded', String(!isOpen));
      });
      document.addEventListener('click', event => {
          if (notificationDropdown && !event.target.closest('.contact-notifications')) {
              notificationDropdown.hidden = true;
              notificationButton?.setAttribute('aria-expanded', 'false');
          }
      });
      document.getElementById('btn-hacer-llamada-seguimiento')?.addEventListener('click', event => {
          const btn = event.currentTarget;
          if (!followupStarted) {
              const phoneChoice = document.getElementById('followup-phone-choice');
              telefonoSeguimiento = numeroSeleccionado(phoneChoice, activeCase?.phone, activeCase?.phoneAlt);
               followupStarted = new Date(); btn.classList.add('is-running'); btn.classList.remove('is-complete'); btn.textContent = '☎ Finalizar llamada';
               if (phoneChoice) { phoneChoice.disabled = true; actualizarTarjetasTelefono(phoneChoice); }
              document.getElementById('followup-start-date').value = localParts(followupStarted).date;
              document.getElementById('followup-start-time').value = localParts(followupStarted).time;
               setText('followup-call-status', `Llamando al ${telefonoSeguimiento || 'número no registrado'}...`);
               document.querySelector('#modalSeguimientoCaso .call-status-dot')?.classList.add('calling');
              followupTicker = setInterval(() => setText('followup-timer', elapsedTime(followupStarted)), 1000); return;
          }
          followupEnded = new Date(); clearInterval(followupTicker); btn.disabled = true; btn.classList.remove('is-running'); btn.classList.add('is-complete'); btn.textContent = '✓ Llamada finalizada';
              document.getElementById('followup-end-time').value = localParts(followupEnded).time;
          document.getElementById('followup-end-date').value = localParts(followupEnded).date;
          setText('followup-timer', elapsedTime(followupStarted, followupEnded));
          document.getElementById('followup-phone-choice').disabled = true;
          actualizarTarjetasTelefono(document.getElementById('followup-phone-choice'));
          setText('followup-call-status', `Llamada finalizada (${telefonoSeguimiento || 'número no registrado'}) • Duración: ${elapsedTime(followupStarted, followupEnded)}`);
          document.querySelector('#modalSeguimientoCaso .call-status-dot')?.classList.remove('calling');
          document.querySelector('#modalSeguimientoCaso .call-status-dot')?.classList.add('finished');
          document.getElementById('btn-save-followup').disabled = false;
     });
      document.getElementById('followup-status')?.addEventListener('change', event => {
          const status = event.currentTarget.selectedOptions[0]?.text
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const needsSchedule = status === 'en proceso' || status === 'sin gestion';
          const schedule = document.getElementById('followup-schedule');
          const date = document.getElementById('followup-date');
          const time = document.getElementById('followup-time');
          schedule.hidden = !needsSchedule;
          date.required = needsSchedule;
          time.required = needsSchedule;
          const automaticOneHour = status === 'sin gestion';
          date.readOnly = automaticOneHour;
          time.readOnly = automaticOneHour;
          if (automaticOneHour) {
              const nextContact = new Date(Date.now() + 60 * 60 * 1000);
              const parts = localParts(nextContact);
              date.value = parts.date;
              time.value = parts.time.slice(0, 5);
              document.getElementById('followup-schedule-title').textContent = 'Próximo contacto automático';
              document.getElementById('followup-schedule-description').textContent = 'Por el resultado “Sin gestión”, volveremos a contactar dentro de una hora.';
          } else if (needsSchedule) {
              date.readOnly = false;
              time.readOnly = false;
              date.min = localParts(new Date()).date;
              document.getElementById('followup-schedule-title').textContent = 'Programar próximo contacto';
              document.getElementById('followup-schedule-description').textContent = 'Define cuándo volverás a contactar al cliente.';
          } else {
              date.value = '';
              time.value = '';
          }
      });
       const closeFollowup = () => { clearInterval(followupTicker); followupStarted = null; followupEnded = null; document.getElementById('modalSeguimientoCaso').classList.remove('show'); document.getElementById('btn-hacer-llamada-seguimiento').disabled = false; document.getElementById('btn-hacer-llamada-seguimiento').classList.remove('is-running', 'is-complete'); document.getElementById('btn-hacer-llamada-seguimiento').textContent = '☎ Hacer llamada'; document.getElementById('followup-phone-choice').disabled = false; document.getElementById('btn-save-followup').disabled = true; };
     document.getElementById('close-seguimiento-x')?.addEventListener('click', closeFollowup); document.getElementById('btn-descartar-seguimiento')?.addEventListener('click', closeFollowup);
     document.getElementById('followup-form')?.addEventListener('submit', async event => {
          event.preventDefault();
          if (!followupStarted || !followupEnded) return alert('Inicia y finaliza la llamada antes de guardar.');
          const status = document.getElementById('followup-status');
          const statusName = status.selectedOptions[0]?.text
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const needsSchedule = statusName === 'en proceso' || statusName === 'sin gestion';
          const scheduledDate = document.getElementById('followup-date').value;
          const scheduledTime = document.getElementById('followup-time').value;
          if (needsSchedule && (!scheduledDate || !scheduledTime)) {
              return alert('Selecciona la fecha y hora para volver a contactar.');
          }
          const followupAt = needsSchedule ? `${scheduledDate} ${scheduledTime}:00` : null;
          if (statusName !== 'sin gestion' && followupAt && new Date(followupAt.replace(' ', 'T')).getTime() <= Date.now()) {
              return alert('La fecha y hora para volver a contactar deben ser futuras.');
          }
           const body = { typificationId: document.getElementById('followup-typification').value, statusId: status.value, reason: document.getElementById('followup-campaign-card')?.dataset.campaign || '', observation: document.getElementById('followup-observation').value.trim(), date: localParts(followupStarted).date, startTime: localParts(followupStarted).time, endTime: localParts(followupEnded).time, duration: elapsedTime(followupStarted, followupEnded), followupAt };
          const saveButton = document.getElementById('btn-save-followup');
          if (saveButton?.disabled) return;
          if (saveButton) saveButton.disabled = true;
          try { const response = await fetch(`/api/interacciones/casos/${activeCase.id}/seguimiento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No se pudo guardar'); closeFollowup(); await loadCases(); await cargarInteraccionesHoy(); } catch (error) { if (saveButton) saveButton.disabled = false; alert(error.message); }
     });
      setInterval(() => loadCases().catch(console.error), 30000);
      loadCases().catch(console.error);
     cargarClientesAsignados();
    cargarInteraccionesHoy();
});
