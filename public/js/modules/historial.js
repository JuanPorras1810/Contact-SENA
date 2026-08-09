document.addEventListener('DOMContentLoaded', () => {
    const contacts = document.getElementById('contacts-table') || document.getElementById('table-contacts'); const tickets = document.getElementById('tickets-table') || document.getElementById('table-tickets'); const contactTab = document.getElementById('contacts-tab') || document.getElementById('btn-contacts'); const ticketTab = document.getElementById('tickets-tab') || document.getElementById('btn-tickets'); const agent = document.getElementById('history-agent'); const search = document.getElementById('history-search') || document.querySelector('.filter-search-group input'); const result = document.getElementById('history-results');
    if (!contacts || !tickets || !contactTab || !ticketTab) return;
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const bodyOf = table => table?.tagName === 'TABLE' ? table.tBodies[0] : table?.querySelector('tbody');
    const loadHistory = async () => {
        try {
            let currentUser = null;
            try { currentUser = JSON.parse(localStorage.getItem('contact-sena-user') || 'null'); } catch { currentUser = null; }
            const isAgent = !document.getElementById('history-agent') && currentUser?.role === 'agente';
            const response = await fetch(isAgent ? `/api/historial/agente?agentId=${encodeURIComponent(currentUser.id)}` : '/api/historial');
            if (!response.ok) throw new Error('No se pudo cargar el historial');
            const payload = await response.json();
            const contactsBody = bodyOf(contacts);
            const ticketsBody = bodyOf(tickets);
            contactsBody.replaceChildren();
            ticketsBody.replaceChildren();
            (payload.contacts || []).forEach((item, index) => {
                const row = document.createElement('tr');
                row.dataset.agent = String(item.agent || '').split(/\s+/)[0].toLowerCase();
                row.dataset.search = `${item.agent} ${item.client} ${item.reason} ${item.typification}`.toLowerCase();
                row.innerHTML = `<td><strong class="cod-blue">#${item.id || index + 1}</strong></td><td>${formatDate(item.date)}</td><td class="col-cliente">${escapeHtml(item.client)}</td><td><span class="col-campana">${escapeHtml(item.typification || item.reason)}</span></td><td>${escapeHtml(item.observation)}</td><td><span class="col-estado ${item.status === 'Cerrado' ? 'estado-resuelto' : 'estado-pendiente'}">${escapeHtml(item.status)}</span></td>`;
                contactsBody.appendChild(row);
            });
            (payload.tickets || []).forEach(item => {
                const row = document.createElement('tr');
                row.dataset.agent = String(item.agent || '').split(/\s+/)[0].toLowerCase();
                row.dataset.search = `${item.agent} ${item.reason} ${item.comment}`.toLowerCase();
                row.innerHTML = `<td><strong class="cod-blue">#${item.id}</strong></td><td>${formatDate(item.startDate)}</td><td>${item.endDate ? formatDate(item.endDate) : 'Abierto'}</td><td>${escapeHtml(item.comment || item.reason)}</td>`;
                ticketsBody.appendChild(row);
            });
            filter();
        } catch (error) { bodyOf(contacts)?.replaceChildren(); bodyOf(tickets)?.replaceChildren(); console.error(error); filter(); }
    };
    const filter = () => { const rows = [...(tickets.classList.contains('hidden') ? contacts : tickets).querySelectorAll('tbody tr')]; let count = 0; rows.forEach(row => { const visible = (!agent || agent.value === 'all' || row.dataset.agent === agent.value) && (!search || !search.value.trim() || (row.dataset.search || row.textContent).toLowerCase().includes(search.value.trim().toLowerCase())); row.hidden = !visible; if (visible) count++; }); if (result) result.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`; };
    const switchTab = showContacts => { contactTab.classList.toggle('active', showContacts); ticketTab.classList.toggle('active', !showContacts); contacts.classList.toggle('hidden', !showContacts); tickets.classList.toggle('hidden', showContacts); if (search) search.placeholder = showContacts ? 'Buscar...' : 'Buscar...'; filter(); };
    window.showTab = tab => switchTab(tab === 'contacts');
    contactTab.addEventListener('click', () => switchTab(true)); ticketTab.addEventListener('click', () => switchTab(false)); agent?.addEventListener('change', filter); search?.addEventListener('input', filter);
    loadHistory();
});
