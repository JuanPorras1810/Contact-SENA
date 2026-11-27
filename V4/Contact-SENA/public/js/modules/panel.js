document.addEventListener('DOMContentLoaded', () => {
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const marcarCliente = elemento => {
        const id = elemento.clientId ?? elemento.client?.id;
        const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name);
        if (id === undefined || id === null || id === '') return escaparHtml(nombre || 'Cliente');
        return `<span class="client-reference"><strong>Cliente #${escaparHtml(id)}</strong>${nombre ? `<small>${escaparHtml(nombre)}</small>` : ''}</span>`;
    };
    const formatearHora = valor => valor ? String(valor).slice(0, 8) : '—';
    const claseResultado = resultado => {
        const valor = String(resultado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (valor === 'efectivo') return 'history-result-effective';
        if (valor === 'en proceso') return 'history-result-progress';
        return 'history-result-unmanaged';
    };
    const abrirTrazabilidadCaso = async caso => {
        const modal = document.getElementById('panel-case-trace-modal');
        const rows = document.getElementById('panel-case-trace-rows');
        const summary = document.getElementById('panel-case-trace-summary');
        if (!modal || !rows) return;
        const cliente = caso.clientId ? ` (Cliente #${escaparHtml(caso.clientId)})` : '';
        const identificacionAsesor = escaparHtml(caso.agentDocumentId || 'Sin ID');
        const nombreAsesor = escaparHtml(caso.agent || 'Asesor');
        summary.innerHTML = `<span>Caso #${escaparHtml(caso.id)} · ${escaparHtml(caso.clientName || 'Cliente')}${cliente}</span><span class="history-trace-advisor">Asesor: ${identificacionAsesor} - ${nombreAsesor}</span>`;
        const title = document.getElementById('panel-case-trace-title');
        if (title) title.textContent = 'Trazabilidad de llamada';
        rows.innerHTML = '<p class="history-trace-empty">Cargando trazabilidad...</p>';
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        try {
            const response = await fetch(`/api/panel/casos/${encodeURIComponent(caso.id)}/trazabilidad`);
            if (!response.ok) throw new Error('No se pudo cargar la trazabilidad');
            const payload = await response.json();
            rows.innerHTML = (payload.data || []).map((item, index) => `<article class="history-trace-card">
                <div class="history-trace-card-heading">
                    <span class="history-trace-index">INTERACCIÓN #${index + 1}</span>
                    <time><svg class="history-trace-calendar" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>${escaparHtml(formatearFecha(item.date))}</time>
                </div>
                <div class="history-trace-meta">
                    <span><small>HORA INICIO</small><strong>${escaparHtml(formatearHora(item.startTime))}</strong></span>
                    <span><small>HORA CIERRE</small><strong>${escaparHtml(formatearHora(item.endTime))}</strong></span>
                    <span><small>DURACIÓN</small><strong class="history-trace-duration">${escaparHtml(formatearHora(item.duration))}</strong></span>
                    <span><small>TIPIFICACIÓN</small><strong class="history-trace-nowrap">${escaparHtml(item.typification)}</strong></span>
                    <span><small>RESULTADO</small><strong><span class="history-result ${claseResultado(item.status)}">${escaparHtml(item.status)}</span></strong></span>
                     <span><small>ASESOR</small><strong>${escaparHtml(item.agentDocumentId || 'Sin ID')} - ${escaparHtml(item.agent || 'Asesor')}</strong></span>
                </div>
                <div class="history-trace-observation"><small>OBSERVACIÓN DE LA GESTIÓN</small><p>${escaparHtml(item.observation || 'Sin observaciones registradas.')}</p></div>
            </article>`).join('') || '<p class="history-trace-empty">No hay llamadas registradas para este caso.</p>';
        } catch (error) {
            rows.innerHTML = '<p class="history-trace-empty">No se pudo cargar la trazabilidad.</p>';
            console.error(error);
        }
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
            const connected = datos.connected || []; const cases = datos.cases || []; const activities = datos.activities || [];
            filasConectados?.replaceChildren(); filasCasos?.replaceChildren(); filasActividades?.replaceChildren();
            connected.forEach(elemento => { const fila = document.createElement('tr'); fila.innerHTML = `<td><strong class="col-cliente">${escaparHtml(elemento.id)}</strong></td><td><span class="col-canal">${escaparHtml(elemento.name)}</span></td><td><span class="open-badge">En Línea</span></td>`; filasConectados?.appendChild(fila); });
            cases.forEach(elemento => {
                const fila = document.createElement('tr');
                fila.innerHTML = `<td><strong class="cod-blue">#${escaparHtml(elemento.id)}</strong></td>
                    <td>${escaparHtml(formatearFecha(elemento.createdAt))}</td>
                    <td><span class="col-canal">${escaparHtml(elemento.agent)}</span></td>
                    <td>${marcarCliente(elemento)}</td>
                    <td>${escaparHtml(elemento.typification)}</td>
                    <td><button type="button" class="btn-trace-case" data-case-trace="${escaparHtml(elemento.id)}">Ver llamadas</button></td>`;
                fila.querySelector('[data-case-trace]')?.addEventListener('click', () => abrirTrazabilidadCaso(elemento));
                filasCasos?.appendChild(fila);
            });
            activities.forEach(elemento => { const fila = document.createElement('tr'); fila.innerHTML = `<td><strong class="cod-blue">#${elemento.id}</strong></td><td><span class="col-canal">${escaparHtml(elemento.agent)}</span></td><td>${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign)}</span></td><td>${escaparHtml(elemento.typification)}</td>`; filasActividades?.appendChild(fila); });
            if (filasConectados && !filasConectados.children.length) filasConectados.innerHTML = '<tr><td colspan="3" class="empty-table-state">No hay agentes conectados.</td></tr>';
            if (filasCasos && !filasCasos.children.length) filasCasos.innerHTML = '<tr><td colspan="6" class="empty-table-state">No hay casos abiertos.</td></tr>';
            if (filasActividades && !filasActividades.children.length) filasActividades.innerHTML = '<tr><td colspan="5" class="empty-table-state">No hay actividades registradas.</td></tr>';
        } catch (error) { document.getElementById('connected-rows')?.replaceChildren(); document.getElementById('cases-rows')?.replaceChildren(); document.getElementById('activities-rows')?.replaceChildren(); console.error(error); }
    };
    cargarPanel();
    document.querySelectorAll('[data-close-case-trace]').forEach(button => button.addEventListener('click', () => {
        const modal = document.getElementById('panel-case-trace-modal');
        modal?.classList.remove('show');
        modal?.setAttribute('aria-hidden', 'true');
    }));
    const colors = { 'card-agentes': 'highlight-blue', 'card-casos': 'highlight-amber', 'card-actividades': 'highlight-purple' }; const sections = ['seccion-tabla-agentes', 'seccion-tabla-casos', 'seccion-tabla-actividades', 'seccion-tabla-bitacora'];
    const showSection = id => sections.forEach(sectionId => { const section = document.getElementById(sectionId); if (section) { section.classList.toggle('active-section', sectionId === id); section.style.display = sectionId === id ? 'block' : 'none'; } });
    Object.keys(colors).forEach(id => document.getElementById(id)?.addEventListener('click', event => { Object.keys(colors).forEach(cardId => document.getElementById(cardId)?.classList.remove('highlight-blue', 'highlight-amber', 'highlight-purple', 'active-card-init')); const card = event.currentTarget; card.classList.add(colors[id]); if (card.dataset.target) showSection(card.dataset.target); }));
    const initial = document.querySelector('.active-card-init') || document.getElementById('card-casos'); if (initial) { initial.classList.add(colors[initial.id]); showSection(initial.dataset.target); }
});
