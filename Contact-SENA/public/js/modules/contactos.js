document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-nuevo-contacto');
    const button = document.getElementById('btn-nuevo-contacto');
    const filasAsignadas = document.getElementById('assigned-clients-rows');
    let clientesAsignados = [];
    let clienteActual = null;
    let gestionIniciadaEn = null;
    let llamadaFinalizadaEn = null;
    let llamadaEnCurso = false;
    let relojLlamada = null;
    if (!modal || !button) return;

    const detenerReloj = () => { if (relojLlamada) { clearInterval(relojLlamada); relojLlamada = null; } };
    const resetearLlamada = () => {
        detenerReloj(); gestionIniciadaEn = null; llamadaFinalizadaEn = null; llamadaEnCurso = false;
        const buttonCall = document.getElementById('btn-hacer-llamada');
        const save = document.getElementById('btn-guardar-contacto');
        if (buttonCall) { buttonCall.disabled = false; buttonCall.textContent = '☎ Hacer llamada'; }
        if (save) save.disabled = true;
        setText('call-simulator-timer', '00:00:00');
        setText('call-simulator-status', 'La llamada aún no ha iniciado.');
    };
    const close = () => { resetearLlamada(); modal.classList.remove('show'); };
    const setText = (id, value, fallback = '-') => { const element = document.getElementById(id); if (element) element.textContent = value || fallback; };
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
    const cargarInteraccionesHoy = async () => {
        if (!filasAsignadas) return;
        try {
            const respuesta = await fetch('/api/interacciones/hoy');
            if (!respuesta.ok) throw new Error('No se pudieron cargar las interacciones de hoy');
            const datosRespuesta = await respuesta.json();
            filasAsignadas.replaceChildren();
            const interacciones = datosRespuesta.data || [];
            if (!interacciones.length) {
                const fila = document.createElement('tr');
                fila.innerHTML = '<td colspan="6" class="empty-assigned-clients">No hay interacciones registradas hoy.</td>';
                filasAsignadas.appendChild(fila);
                return;
            }
            interacciones.forEach(elemento => {
                const fila = document.createElement('tr');
                 fila.innerHTML = `<td class="col-cliente">${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign)}</span></td><td>${escaparHtml(elemento.typification)}</td><td>${escaparHtml(elemento.observation)}</td><td><div class="time-box"><span>${escaparHtml(elemento.duration || '--')}</span></div></td><td><span class="col-estado ${elemento.status === 'Efectivo' ? 'estado-resuelto' : 'estado-pendiente'}">${escaparHtml(elemento.status)}</span></td>`;
                filasAsignadas.appendChild(fila);
            });
        } catch (error) { filasAsignadas.replaceChildren(); console.error(error); }
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
        setText('contact-client-document', cliente.documentId, 'No registrado');
        setText('contact-client-name', cliente.name, 'No registrado');
        setText('contact-client-phone', cliente.phone);
        setText('contact-client-phone-alt', cliente.phoneAlt, 'No registrado');
        setText('contact-client-email', cliente.email, 'No registrado');
        setText('contact-client-address', cliente.address, 'No registrada');
        setText('contact-client-observation', cliente.observation, 'Sin observaciones registradas.');
        const reason = document.getElementById('contact-reason');
        if (reason) reason.value = cliente.campaign || '';
        const pdfButton = document.getElementById('open-contact-campaign-pdf');
        if (pdfButton) { pdfButton.disabled = !cliente.campaignPdf; pdfButton.onclick = () => { if (cliente.campaignPdf) window.open(cliente.campaignPdf, '_blank', 'noopener'); }; }
        try { await cargarCatalogos(cliente.campaignId); } catch (error) { alert(error.message); return; }
         modal.classList.add('show');
    };

    document.getElementById('btn-hacer-llamada')?.addEventListener('click', () => {
        const buttonCall = document.getElementById('btn-hacer-llamada');
        const save = document.getElementById('btn-guardar-contacto');
        if (!gestionIniciadaEn) {
            gestionIniciadaEn = new Date();
            llamadaEnCurso = true;
            setContactTimes(gestionIniciadaEn, gestionIniciadaEn);
            if (buttonCall) buttonCall.textContent = '☎ Finalizar llamada';
            if (save) save.disabled = true;
            setText('call-simulator-status', 'Llamada iniciada. Presiona nuevamente para finalizarla.');
            relojLlamada = setInterval(() => setText('call-simulator-timer', elapsedTime(gestionIniciadaEn)), 1000);
            return;
        }
        if (!llamadaEnCurso) return;
        llamadaFinalizadaEn = new Date();
        llamadaEnCurso = false;
        detenerReloj();
        setContactTimes(gestionIniciadaEn, llamadaFinalizadaEn);
        setText('call-simulator-timer', elapsedTime(gestionIniciadaEn, llamadaFinalizadaEn));
        if (buttonCall) { buttonCall.disabled = true; buttonCall.textContent = '✓ Llamada finalizada'; }
        if (save) save.disabled = false;
        setText('call-simulator-status', 'Llamada finalizada. Completa el resultado y guarda la gestión.');
    });

    const cargarClientesAsignados = async () => {
        const user = await window.ContactSena?.ready.then(() => window.ContactSena.user).catch(() => null);
        if (!user?.id || user.role !== 'agente') { clientesAsignados = []; return; }
        try {
            const respuesta = await fetch(`/api/clientes/asignados?agentId=${encodeURIComponent(user.id)}`);
            if (!respuesta.ok) throw new Error('No se pudieron cargar los clientes asignados');
            const datosRespuesta = await respuesta.json();
            clientesAsignados = (datosRespuesta.data || []).filter(cliente => cliente.attended === false || cliente.attended === 0 || cliente.attended === '0' || cliente.attended === null);
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
    const updateTicketBox = () => { if (!select || !ticketBox) return; const status = select.options[select.selectedIndex].text.toLowerCase().trim(); ticketBox.classList.toggle('d-none', status === 'efectivo' || !status); };
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
         const cuerpo = { assignmentId: clienteActual?.assignmentId, agentId: user?.id, typificationId: document.getElementById('contact-typification')?.value, statusId: document.getElementById('select-cierre-caso')?.value, reason: document.getElementById('contact-reason')?.value.trim(), observation: document.getElementById('contact-observation')?.value.trim(), caseComment: document.getElementById('contact-case-comment')?.value.trim(), date: partesInicio.date, startTime: partesInicio.time, endTime: partesFin.time, duration: elapsedTime(gestionIniciadaEn, contactEndedAt) };
        const selectedStatus = select?.options[select.selectedIndex]?.text.toLowerCase().trim();
         if (selectedStatus !== 'efectivo' && !cuerpo.caseComment) { alert('El comentario del caso es obligatorio para estados en proceso o sin gestión.'); return; }
        try {
            const respuesta = await fetch('/api/interacciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
            const datosRespuesta = await respuesta.json();
            if (!respuesta.ok) throw new Error(datosRespuesta.error || 'No se pudo guardar la gestión');
            form.reset();
            close();
            await cargarClientesAsignados();
            await cargarInteraccionesHoy();
            alert(datosRespuesta.data.caseCreated ? 'Gestión y caso guardados correctamente.' : 'Gestión guardada correctamente.');
        } catch (error) { alert(error.message); }
    });
    cargarClientesAsignados();
    cargarInteraccionesHoy();
});
