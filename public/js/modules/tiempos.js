document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.time-table, .time-table-agent');
    const body = document.getElementById('time-rows') || table?.tBodies[0];
    const agent = document.getElementById('time-agent') || { value: 'all', addEventListener: () => {} };
    const search = document.getElementById('time-search') || document.querySelector('.filter-search-group input') || { value: '', addEventListener: () => {} };
    const result = document.getElementById('time-results');
    const startDate = document.getElementById('time-start') || document.getElementById('fecha-inicio');
    const endDate = document.getElementById('time-end') || document.getElementById('fecha-fin');
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    if (!table || !body || !agent || !search) return;

    const formatTime = value => {
        if (!value) return '';
        const [hourText, minute] = value.split(':');
        const hour = Number(hourText);
        const meridiem = hour >= 12 ? 'p. m.' : 'a. m.';
        const displayHour = hour % 12 || 12;
        return `${String(displayHour).padStart(2, '0')}:${minute} ${meridiem}`;
    };

    const icon = (type, path) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `${type}-icon`);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        element.setAttribute('d', path);
        svg.appendChild(element);
        return svg;
    };

    const loginPath = 'M11 7 9.6 8.4l3.6 3.6H3v2h10.2l-3.6 3.6L11 19l6-6-6-6zm7-3H7c-1.1 0-2 .9-2 2v3h2V6h11v12H7v-3H5v3c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z';
    const logoutPath = 'm13 7 1.4 1.4-3.6 3.6H21v2H10.8l3.6 3.6L13 19l-6-6 6-6zm-7-3h11c1.1 0 2 .9 2 2v3h-2V6H6v12h11v-3h2v3c0 1.1-.9 2-2-2V6c0-1.1.9-2-2-2z';

    const agentKey = name => String(name || '').trim().split(/\s+/)[0].toLowerCase();

    const renderRows = data => {
        const isSupervisor = Boolean(document.querySelector('.supervisor-time-header'));
        const header = table.tHead?.rows[0];
        if (header && header.cells.length === 6) header.deleteCell(2);
        table.classList.add('is-loaded');
        body.replaceChildren();
        data.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.agent = agentKey(item.name);
            row.dataset.search = `${item.date} ${item.name} ${item.userId}`.toLowerCase();

            const date = document.createElement('td');
            date.className = 'col-codigo';
            date.textContent = item.date || '';

            const person = document.createElement('td');
            person.className = 'supervisor-person';
            const personContent = document.createElement('span');
            personContent.className = 'person-content';
            const name = document.createElement('strong');
            name.textContent = item.name || '';
            personContent.appendChild(name);
            if (isSupervisor) {
                const documentLabel = document.createElement('small');
                documentLabel.className = 'person-document';
                documentLabel.textContent = `ID: ${item.userId || ''}`;
                personContent.appendChild(documentLabel);
            }
            person.appendChild(personContent);

            const start = document.createElement('td');
            start.className = 'time-entry';
            start.append(icon('login', loginPath), document.createTextNode(formatTime(item.startTime)));

            const end = document.createElement('td');
            if (item.active) {
                const status = document.createElement('span');
                status.className = 'session-open';
                status.textContent = 'En sesión';
                end.appendChild(status);
            } else {
                end.className = 'time-entry';
                end.append(icon('logout', logoutPath), document.createTextNode(formatTime(item.endTime)));
            }

            const total = document.createElement('td');
            total.textContent = item.totalTime ? String(item.totalTime).slice(0, 5).replace(':', 'h ') + 'm' : item.active ? 'En curso...' : '';
            row.append(date, person, start, end, total);
            body.appendChild(row);
        });
    };

    let rows = [...body.querySelectorAll('tr')];
    const filter = () => {
        let count = 0;
        rows.forEach(row => {
            const visible = (agent.value === 'all' || row.dataset.agent === agent.value) && (!search.value.trim() || row.dataset.search.toLowerCase().includes(search.value.trim().toLowerCase()));
            row.hidden = !visible;
            if (visible) count++;
        });
        if (result) result.textContent = `${count} ${count === 1 ? 'registro' : 'registros'}`;
    };

    const load = async () => {
        body.replaceChildren();
        rows = [];
        try {
            const isSupervisor = Boolean(document.querySelector('.supervisor-time-header'));
            const endpoint = isSupervisor ? '/api/tiempos/supervisor' : '/api/tiempos/agente';
            let currentUser = null;
            try { currentUser = JSON.parse(localStorage.getItem('contact-sena-user') || 'null'); } catch { currentUser = null; }
            if (!isSupervisor && (!currentUser || currentUser.role !== 'agente' || !currentUser.id)) return;
            const params = new URLSearchParams();
            if (startDate?.value) params.set('start', startDate.value);
            if (endDate?.value) params.set('end', endDate.value);
            if (isSupervisor && /^\d+$/.test(agent.value || '')) params.set('agentId', agent.value);
            if (!isSupervisor) params.set('agentId', currentUser.id);
            if (search.value.trim()) params.set('search', search.value.trim());
            const response = await fetch(`${endpoint}?${params}`);
            if (!response.ok) return;
            const payload = await response.json();
            renderRows(payload.data || []);
            rows = [...body.querySelectorAll('tr')];
            filter();
        } catch {
            filter();
        }
    };

    agent.addEventListener('change', filter);
    search.addEventListener('input', filter);
    startDate?.addEventListener('change', load);
    endDate?.addEventListener('change', load);
    filter();
    load();
});
