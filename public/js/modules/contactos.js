document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-nuevo-contacto');
    const button = document.getElementById('btn-nuevo-contacto');
    const assignedRows = document.getElementById('assigned-clients-rows');
    let assignedClients = [];
    let currentClient = null;
    let contactStartedAt = null;
    if (!modal || !button) return;

    const close = () => modal.classList.remove('show');
    const setText = (id, value, fallback = '-') => { const element = document.getElementById(id); if (element) element.textContent = value || fallback; };
    const localParts = value => { const pad = item => String(item).padStart(2, '0'); return { date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`, time: `${pad(value.getHours())}:${pad(value.getMinutes())}` }; };
    const setContactTimes = (start, end = new Date()) => { const startParts = localParts(start); const endParts = localParts(end); document.getElementById('contact-start-date').value = startParts.date; document.getElementById('contact-start-time').value = startParts.time; document.getElementById('contact-end-date').value = endParts.date; document.getElementById('contact-end-time').value = endParts.time; };
    const elapsedTime = (start, end) => { const seconds = Math.max(0, Math.floor((end - start) / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
    const setOptions = (select, items) => { if (select) select.replaceChildren(new Option('Seleccione...', '')); (items || []).forEach(item => select.appendChild(new Option(item.name, item.id))); };
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const loadTodayInteractions = async () => {
        if (!assignedRows) return;
        try {
            const response = await fetch('/api/interacciones/hoy');
            if (!response.ok) throw new Error('No se pudieron cargar las interacciones de hoy');
            const payload = await response.json();
            assignedRows.replaceChildren();
            const interactions = payload.data || [];
            if (!interactions.length) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="7" class="empty-assigned-clients">No hay interacciones registradas hoy.</td>';
                assignedRows.appendChild(row);
                return;
            }
            interactions.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="col-cliente">${escapeHtml(item.client)}</td><td><span class="col-campana">${escapeHtml(item.campaign)}</span></td><td>${escapeHtml(item.channel)}</td><td>${escapeHtml(item.typification)}</td><td>${escapeHtml(item.observation)}</td><td><div class="time-box"><span>${escapeHtml(item.duration || '--')}</span></div></td><td><span class="col-estado ${item.status === 'Cerrado' ? 'estado-resuelto' : 'estado-pendiente'}">${escapeHtml(item.status)}</span></td>`;
                assignedRows.appendChild(row);
            });
        } catch (error) { assignedRows.replaceChildren(); console.error(error); }
    };
    const loadCatalogs = async campaignId => {
        const response = await fetch(`/api/interacciones/catalogos?campaignId=${encodeURIComponent(campaignId)}`);
        if (!response.ok) throw new Error('No se pudieron cargar los catálogos de la gestión');
        const data = await response.json();
        setOptions(document.getElementById('contact-channel'), data.channels);
        setOptions(document.getElementById('contact-typification'), data.typifications);
        setOptions(document.getElementById('select-cierre-caso'), data.statuses);
    };
    const openForClient = async client => {
        if (!client) { alert('No tienes clientes asignados para gestionar.'); return; }
        currentClient = client;
        contactStartedAt = new Date();
        setContactTimes(contactStartedAt);
        setText('contact-client-document', client.documentId);
        setText('contact-client-name', client.name);
        setText('contact-client-phone', client.phone);
        setText('contact-client-phone-alt', client.phoneAlt, 'No registrado');
        setText('contact-client-email', client.email, 'No registrado');
        setText('contact-client-address', client.address, 'No registrada');
        setText('contact-client-observation', client.observation, 'Sin observaciones registradas.');
        const reason = document.getElementById('contact-reason');
        if (reason) reason.value = client.campaign || '';
        const pdfSelect = document.getElementById('contact-campaign-pdf');
        const pdfButton = document.getElementById('open-contact-campaign-pdf');
        if (pdfSelect) { pdfSelect.replaceChildren(new Option(client.campaignPdf ? 'PDF de la campaña' : 'No hay PDF asociado', client.campaignPdf || '')); pdfSelect.disabled = !client.campaignPdf; }
        if (pdfButton) { pdfButton.disabled = !client.campaignPdf; pdfButton.onclick = () => { if (client.campaignPdf) window.open(client.campaignPdf, '_blank', 'noopener'); }; }
        try { await loadCatalogs(client.campaignId); } catch (error) { alert(error.message); return; }
        modal.classList.add('show');
    };

    const loadAssignedClients = async () => {
        if (!assignedRows) return;
        let user = null;
        try { user = JSON.parse(localStorage.getItem('contact-sena-user') || 'null'); } catch { user = null; }
        if (!user?.id || user.role !== 'agente') { assignedRows.replaceChildren(); showEmptyState(); return; }
        try {
            const response = await fetch(`/api/clientes/asignados?agentId=${encodeURIComponent(user.id)}`);
            if (!response.ok) throw new Error('No se pudieron cargar los clientes asignados');
            const payload = await response.json();
            assignedClients = (payload.data || []).filter(client => client.attended === false || client.attended === 0 || client.attended === '0' || client.attended === null);
            assignedRows.replaceChildren();
            if (!assignedClients.length) { showEmptyState(); return; }
            assignedClients.forEach(client => {
                const row = document.createElement('tr');
                row.tabIndex = 0;
                row.innerHTML = `<td class="col-cliente">${client.name || '-'}</td><td><span class="col-campana">${client.campaign || '-'}</span></td><td>Teléfono: ${client.phone || '-'}</td><td>Sin tipificar</td><td>${client.attended ? 'Atendido' : 'Pendiente de gestión'}</td><td><div class="time-box"><span>--</span></div></td><td><span class="col-estado ${client.attended ? 'estado-resuelto' : 'estado-pendiente'}">${client.attended ? 'Atendido' : 'Pendiente'}</span></td>`;
                row.addEventListener('click', () => openForClient(client));
                row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openForClient(client); } });
                assignedRows.appendChild(row);
            });
        } catch (error) { assignedClients = []; assignedRows.replaceChildren(); showEmptyState(); console.error(error); }
    };

    const showEmptyState = () => { const row = document.createElement('tr'); row.innerHTML = '<td colspan="7" class="empty-assigned-clients">No tienes clientes asignados para gestionar.</td>'; assignedRows?.appendChild(row); };

    button.addEventListener('click', () => openForClient(assignedClients.find(client => !client.attended) || assignedClients[0]));
    document.getElementById('close-contacto-x')?.addEventListener('click', close);
    document.getElementById('btn-descartar-contacto')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
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
        let user = null;
        try { user = JSON.parse(localStorage.getItem('contact-sena-user') || 'null'); } catch { user = null; }
        const contactEndedAt = new Date();
        setContactTimes(contactStartedAt || contactEndedAt, contactEndedAt);
        const startParts = localParts(contactStartedAt || contactEndedAt);
        const endParts = localParts(contactEndedAt);
        const body = { assignmentId: currentClient?.assignmentId, agentId: user?.id, typificationId: document.getElementById('contact-typification')?.value, channelId: document.getElementById('contact-channel')?.value, statusId: document.getElementById('select-cierre-caso')?.value, reason: document.getElementById('contact-reason')?.value.trim(), observation: document.getElementById('contact-observation')?.value.trim(), caseComment: document.getElementById('contact-case-comment')?.value.trim(), date: startParts.date, startTime: `${startParts.time}:00`, endTime: `${endParts.time}:00`, duration: elapsedTime(contactStartedAt || contactEndedAt, contactEndedAt) };
        try {
            const response = await fetch('/api/interacciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la gestión');
            form.reset();
            close();
            await loadAssignedClients();
            await loadTodayInteractions();
            alert(payload.data.caseCreated ? 'Gestión y caso guardados correctamente.' : 'Gestión guardada correctamente.');
        } catch (error) { alert(error.message); }
    });
    loadAssignedClients();
    loadTodayInteractions();
});
