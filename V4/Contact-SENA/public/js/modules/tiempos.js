document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('.time-table, .time-table-agent');
    const body = document.getElementById('time-rows') || table?.tBodies[0];
    const agent = document.getElementById('time-agent') || { value: 'all' };
    const busqueda = { value: '', addEventListener: () => {} };
    const result = document.getElementById('time-results');
    const startDate = document.getElementById('time-start') || document.getElementById('fecha-inicio');
    const endDate = document.getElementById('time-end') || document.getElementById('fecha-fin');
    const today = new Date();
    const localDate = value => { const month = String(value.getMonth() + 1).padStart(2, '0'); const day = String(value.getDate()).padStart(2, '0'); return `${value.getFullYear()}-${month}-${day}`; };
    if (startDate) startDate.value = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
    if (endDate) endDate.value = localDate(today);
    if (!table || !body) return;
    const timeTabs = [...document.querySelectorAll('[data-time-view]')];
    let timeView = 'agents';
    let agentesDisponibles = [];

    const formatearHora = valor => {
        if (!valor) return '';
        const [textoHora, minuto, segundo = '00'] = valor.split(':');
        const hora = Number(textoHora);
        const meridiano = hora >= 12 ? 'p. m.' : 'a. m.';
        const horaVisible = hora % 12 || 12;
        return `${String(horaVisible).padStart(2, '0')}:${minuto}:${segundo} ${meridiano}`;
    };
    const segundosDeDuracion = valor => {
        const partes = String(valor || '00:00:00').split(':').map(Number);
        if (partes.length !== 3 || partes.some(parte => !Number.isFinite(parte))) return 0;
        return partes[0] * 3600 + partes[1] * 60 + partes[2];
    };
    const formatearDuracion = segundos => {
        const total = Math.max(0, Math.floor(segundos));
        return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const icono = (tipo, ruta) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `${tipo}-icon`);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        element.setAttribute('d', ruta);
        svg.appendChild(element);
        return svg;
    };

    const rutaInicio = 'M11 7 9.6 8.4l3.6 3.6H3v2h10.2l-3.6 3.6L11 19l6-6-6-6zm7-3H7c-1.1 0-2 .9-2 2v3h2V6h11v12H7v-3H5v3c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z';
    const logoutPath = 'm13 7 1.4 1.4-3.6 3.6H21v2H10.8l3.6 3.6L13 19l-6-6 6-6zm-7-3h11c1.1 0 2 .9 2 2v3h-2V6H6v12h11v-3h2v3c0 1.1-.9 2-2-2V6c0-1.1.9-2-2-2z';

    const claveAgente = nombre => String(nombre || '').trim().split(/\s+/)[0].toLowerCase();

    const renderizarFilas = datos => {
        const isSupervisor = Boolean(document.querySelector('.supervisor-time-header'));
        const header = table.tHead?.rows[0];
        if (isSupervisor && header && header.cells.length === 7) header.deleteCell(2);
        if (isSupervisor && header?.cells[1]) header.cells[1].textContent = timeView === 'mine' ? 'Supervisor' : 'Agente';
        table.classList.add('is-loaded');
        body.replaceChildren();
        datos.forEach(elemento => {
            const row = document.createElement('tr');
            row.dataset.agent = String(elemento.userId || '');
            row.dataset.search = `${elemento.date} ${elemento.name} ${elemento.userId}`.toLowerCase();

            const date = document.createElement('td');
            date.className = 'col-codigo';
            date.textContent = elemento.date || '';

            const person = document.createElement('td');
            person.className = isSupervisor ? 'supervisor-person' : 'agent-time-name';
            const personContent = document.createElement('span');
            personContent.className = 'person-content';
            const name = document.createElement('strong');
            name.textContent = elemento.name || '';
            personContent.appendChild(name);
            if (isSupervisor) {
                const documentLabel = document.createElement('small');
                documentLabel.className = 'person-document';
                documentLabel.textContent = `ID: ${elemento.userId || ''}`;
                personContent.appendChild(documentLabel);
            }
            if (isSupervisor) person.appendChild(personContent);
            else person.textContent = elemento.name || '';

            const start = document.createElement('td');
            start.className = 'time-entry';
            start.append(icono('login', rutaInicio), document.createTextNode(formatearHora(elemento.startTime)));

            const end = document.createElement('td');
            if (elemento.active) {
                const status = document.createElement('span');
                status.className = 'session-open';
                status.textContent = 'En sesión';
                end.appendChild(status);
            } else {
                end.className = 'time-entry';
                end.append(icono('logout', logoutPath), document.createTextNode(formatearHora(elemento.endTime)));
            }

        const total = document.createElement('td');
        total.textContent = elemento.totalTime || (elemento.active ? '00:00:00' : '');
        if (elemento.active) {
            total.dataset.liveSession = 'true';
            total.dataset.baseSeconds = String(segundosDeDuracion(elemento.totalTime));
            total.dataset.startedAt = String(Date.now());
        }
        const pause = document.createElement('td');
        pause.textContent = elemento.pauseTime || '00:00:00';
        row.append(date, person, start, end, total, pause);
            body.appendChild(row);
        });
        if (!datos.length) body.innerHTML = `<tr><td colspan="${isSupervisor ? 6 : 5}" class="empty-table-state">No hay registros de tiempo para mostrar.</td></tr>`;
    };

    setInterval(() => {
        const ahora = Date.now();
        body.querySelectorAll('td[data-live-session="true"]').forEach(celda => {
            const base = Number(celda.dataset.baseSeconds) || 0;
            const desdeRespuesta = Math.floor((ahora - Number(celda.dataset.startedAt)) / 1000);
            celda.textContent = formatearDuracion(base + Math.max(0, desdeRespuesta));
        });
    }, 1000);

    let rows = [...body.querySelectorAll('tr')];
    const filtrar = () => {
        let count = 0;
        rows.forEach(row => {
            const visible = timeView !== 'agents' || agent.value === 'all' || row.dataset.agent === agent.value;
            row.hidden = !visible;
            if (visible) count++;
        });
        if (result) result.textContent = `${count} ${count === 1 ? 'registro' : 'registros'}`;
    };

    const cargar = async () => {
        body.replaceChildren();
        rows = [];
        try {
            const isSupervisor = Boolean(document.querySelector('.supervisor-time-header'));
            const endpoint = isSupervisor ? (timeView === 'mine' ? '/api/tiempos/propio' : '/api/tiempos/supervisor') : '/api/tiempos/agente';
            const currentUser = await window.ContactSena?.ready.then(() => window.ContactSena.user).catch(() => null);
            if (!isSupervisor && (!currentUser || currentUser.role !== 'agente' || !currentUser.id)) return;
            const params = new URLSearchParams();
            if (startDate?.value) params.set('start', startDate.value);
            if (endDate?.value) params.set('end', endDate.value);
            if (isSupervisor && timeView === 'agents' && agent.value !== 'all') params.set('agentId', agent.value);
            if (!isSupervisor) params.set('agentId', currentUser.id);
            const response = await fetch(`${endpoint}?${params}`);
            if (!response.ok) return;
            const payload = await response.json();
            renderizarFilas(payload.data || []);
            rows = [...body.querySelectorAll('tr')];
            filtrar();
        } catch {
            filtrar();
        }
    };

    if (document.querySelector('.supervisor-time-header')) {
        fetch('/api/asesores').then(response => response.json()).then(payload => {
            agentesDisponibles = [...new Map((payload.data || []).map(item => [String(item.id), item])).values()];
        }).catch(() => {});
    }
    window.ContactSena?.autocomplete?.({
        input: document.getElementById('time-agent-search'),
        hidden: agent,
        list: document.getElementById('time-agent-suggestions'),
        items: () => agentesDisponibles,
        text: item => `${item.id} - ${item.name}`,
        value: item => item.id,
        onSelect: item => { if (!item) agent.value = 'all'; filtrar(); }
    });

    const actualizarVista = () => {
        const vistaPropia = timeView === 'mine';
        const filtroAgente = document.querySelector('.supervisor-agent-filter');
        if (filtroAgente) {
            filtroAgente.hidden = vistaPropia;
            if (vistaPropia) {
                agent.value = 'all';
                const input = document.getElementById('time-agent-search');
                if (input) input.value = '';
            }
        }
        const titulo = document.getElementById('time-table-title');
        if (titulo) titulo.textContent = vistaPropia ? 'Mi registro de tiempo' : 'Registro de asistencia de agentes';
    };
    timeTabs.forEach(tab => tab.addEventListener('click', () => {
        timeView = tab.dataset.timeView;
        timeTabs.forEach(item => item.classList.toggle('active', item === tab));
        actualizarVista();
        cargar();
    }));
    startDate?.addEventListener('change', cargar);
    endDate?.addEventListener('change', cargar);
    actualizarVista();
    filtrar();
    cargar();
});
