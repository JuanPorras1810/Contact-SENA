document.addEventListener('DOMContentLoaded', () => {
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const marcarCliente = elemento => {
        const id = elemento.clientId ?? elemento.client?.id;
        const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name);
        if (id === undefined || id === null || id === '') return escaparHtml(nombre || 'Cliente');
        return `<span class="client-reference"><strong>Cliente #${escaparHtml(id)}</strong>${nombre ? `<small>${escaparHtml(nombre)}</small>` : ''}</span>`;
    };
    const cargarPanel = async () => {
        try {
            const respuesta = await fetch('/api/panel');
            if (!respuesta.ok) throw new Error('No se pudo cargar el panel');
            const datos = await respuesta.json();
            const metricas = datos.metrics || {};
            const connectedMetric = document.querySelector('#card-agentes .card-value');
            const casesMetric = document.querySelector('#card-casos .card-value');
            const activitiesMetric = document.querySelector('#card-actividades .card-value');
            if (connectedMetric) connectedMetric.textContent = `${metricas.totalAgents || 0} / ${metricas.connectedAgents || 0}`;
            if (casesMetric) casesMetric.textContent = String(metricas.openCases || 0);
            if (activitiesMetric) activitiesMetric.textContent = `${metricas.todayActivities || 0} Gestiones`;
            const filasConectados = document.getElementById('connected-rows'); const filasCasos = document.getElementById('cases-rows'); const filasActividades = document.getElementById('activities-rows');
            filasConectados?.replaceChildren(); filasCasos?.replaceChildren(); filasActividades?.replaceChildren();
            (datos.connected || []).forEach(elemento => { const fila = document.createElement('tr'); fila.innerHTML = `<td><strong class="col-cliente">${escaparHtml(elemento.id)}</strong></td><td><span class="col-canal">${escaparHtml(elemento.name)}</span></td><td><span class="open-badge">En Línea</span></td>`; filasConectados?.appendChild(fila); });
            (datos.cases || []).forEach(elemento => { const fila = document.createElement('tr'); fila.innerHTML = `<td><strong class="cod-blue">TK-${elemento.id}</strong></td><td>${formatearFecha(elemento.createdAt)}</td><td><span class="col-canal">${escaparHtml(elemento.agent)}</span></td><td>${escaparHtml(elemento.comment)}</td>`; filasCasos?.appendChild(fila); });
            (datos.activities || []).forEach(elemento => { const fila = document.createElement('tr'); fila.innerHTML = `<td><strong class="cod-blue">#${elemento.id}</strong></td><td><span class="col-canal">${escaparHtml(elemento.agent)}</span></td><td>${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.reason)}</span></td><td>${escaparHtml(elemento.observation)}</td>`; filasActividades?.appendChild(fila); });
            if (filasConectados && !filasConectados.children.length) filasConectados.innerHTML = '<tr><td colspan="3" class="empty-table-state">No hay agentes conectados.</td></tr>';
            if (filasCasos && !filasCasos.children.length) filasCasos.innerHTML = '<tr><td colspan="4" class="empty-table-state">No hay casos abiertos.</td></tr>';
            if (filasActividades && !filasActividades.children.length) filasActividades.innerHTML = '<tr><td colspan="5" class="empty-table-state">No hay actividades registradas.</td></tr>';
        } catch (error) { document.getElementById('connected-rows')?.replaceChildren(); document.getElementById('cases-rows')?.replaceChildren(); document.getElementById('activities-rows')?.replaceChildren(); console.error(error); }
    };
    cargarPanel();
    const colors = { 'card-agentes': 'highlight-blue', 'card-casos': 'highlight-amber', 'card-actividades': 'highlight-purple' }; const sections = ['seccion-tabla-agentes', 'seccion-tabla-casos', 'seccion-tabla-actividades', 'seccion-tabla-bitacora'];
    const showSection = id => sections.forEach(sectionId => { const section = document.getElementById(sectionId); if (section) { section.classList.toggle('active-section', sectionId === id); section.style.display = sectionId === id ? 'block' : 'none'; } });
    Object.keys(colors).forEach(id => document.getElementById(id)?.addEventListener('click', event => { Object.keys(colors).forEach(cardId => document.getElementById(cardId)?.classList.remove('highlight-blue', 'highlight-amber', 'highlight-purple', 'active-card-init')); const card = event.currentTarget; card.classList.add(colors[id]); if (card.dataset.target) showSection(card.dataset.target); }));
    const initial = document.querySelector('.active-card-init') || document.getElementById('card-casos'); if (initial) { initial.classList.add(colors[initial.id]); showSection(initial.dataset.target); }
});
