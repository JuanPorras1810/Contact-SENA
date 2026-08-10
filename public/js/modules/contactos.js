document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-nuevo-contacto');
    const button = document.getElementById('btn-nuevo-contacto');
    const filasAsignadas = document.getElementById('assigned-clients-rows');
    let clientesAsignados = [];
    let clienteActual = null;
    let gestionIniciadaEn = null;
    if (!modal || !button) return;

    const close = () => modal.classList.remove('show');
    const setText = (id, value, fallback = '-') => { const element = document.getElementById(id); if (element) element.textContent = value || fallback; };
    const localParts = value => { const pad = item => String(item).padStart(2, '0'); return { date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`, time: `${pad(value.getHours())}:${pad(value.getMinutes())}` }; };
    const setContactTimes = (start, end = new Date()) => { const startParts = localParts(start); const endParts = localParts(end); document.getElementById('contact-start-date').value = startParts.date; document.getElementById('contact-start-time').value = startParts.time; document.getElementById('contact-end-date').value = endParts.date; document.getElementById('contact-end-time').value = endParts.time; };
    const elapsedTime = (start, end) => { const seconds = Math.max(0, Math.floor((end - start) / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
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
                fila.innerHTML = '<td colspan="7" class="empty-assigned-clients">No hay interacciones registradas hoy.</td>';
                filasAsignadas.appendChild(fila);
                return;
            }
            interacciones.forEach(elemento => {
                const fila = document.createElement('tr');
                fila.innerHTML = `<td class="col-cliente">${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign)}</span></td><td>${escaparHtml(elemento.channel)}</td><td>${escaparHtml(elemento.typification)}</td><td>${escaparHtml(elemento.observation)}</td><td><div class="time-box"><span>${escaparHtml(elemento.duration || '--')}</span></div></td><td><span class="col-estado ${elemento.status === 'Cerrado' ? 'estado-resuelto' : 'estado-pendiente'}">${escaparHtml(elemento.status)}</span></td>`;
                filasAsignadas.appendChild(fila);
            });
        } catch (error) { filasAsignadas.replaceChildren(); console.error(error); }
    };
    const cargarCatalogos = async idCampana => {
        const respuesta = await fetch(`/api/interacciones/catalogos?campaignId=${encodeURIComponent(idCampana)}`);
        if (!respuesta.ok) throw new Error('No se pudieron cargar los catálogos de la gestión');
        const datos = await respuesta.json();
        establecerOpciones(document.getElementById('contact-channel'), datos.channels);
        establecerOpciones(document.getElementById('contact-typification'), datos.typifications);
        establecerOpciones(document.getElementById('select-cierre-caso'), datos.statuses);
    };
    const abrirParaCliente = async cliente => {
        if (!cliente) { alert('No tienes clientes asignados para gestionar.'); return; }
        clienteActual = cliente;
        gestionIniciadaEn = new Date();
        setContactTimes(gestionIniciadaEn);
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
    const updateTicketBox = () => { if (!select || !ticketBox) return; const status = select.options[select.selectedIndex].text.toLowerCase().trim(); ticketBox.classList.toggle('d-none', status !== 'abierto' && status !== 'escalado'); };
    select?.addEventListener('change', updateTicketBox); updateTicketBox();
    document.querySelectorAll('.col-estado').forEach(status => { const value = status.textContent.trim().toLowerCase(); status.classList.toggle('estado-pendiente', value === 'abierto' || value === 'escalado'); status.classList.toggle('estado-resuelto', value === 'resuelto'); });
    document.getElementById('contact-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const user = window.ContactSena?.user || null;
        const contactEndedAt = new Date();
        setContactTimes(gestionIniciadaEn || contactEndedAt, contactEndedAt);
        const partesInicio = localParts(gestionIniciadaEn || contactEndedAt);
        const partesFin = localParts(contactEndedAt);
        const cuerpo = { assignmentId: clienteActual?.assignmentId, agentId: user?.id, typificationId: document.getElementById('contact-typification')?.value, channelId: document.getElementById('contact-channel')?.value, statusId: document.getElementById('select-cierre-caso')?.value, reason: document.getElementById('contact-reason')?.value.trim(), observation: document.getElementById('contact-observation')?.value.trim(), caseComment: document.getElementById('contact-case-comment')?.value.trim(), date: partesInicio.date, startTime: `${partesInicio.time}:00`, endTime: `${partesFin.time}:00`, duration: elapsedTime(gestionIniciadaEn || contactEndedAt, contactEndedAt) };
        const selectedStatus = select?.options[select.selectedIndex]?.text.toLowerCase().trim();
        if ((selectedStatus === 'abierto' || selectedStatus === 'escalado') && !cuerpo.caseComment) { alert('El comentario del caso es obligatorio para estados abiertos o escalados.'); return; }
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
