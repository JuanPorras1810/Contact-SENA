document.addEventListener('DOMContentLoaded', () => {
    const cuerpoFilas = document.getElementById('indicator-rows');
    const agente = document.getElementById('indicator-agent');
    const busqueda = document.getElementById('indicator-search-input');
    const resultado = document.getElementById('indicator-results');
    if (!cuerpoFilas || !agente || !busqueda) return;
    const hoy = new Date();
    const fechaLocal = valor => `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const formatearDuracion = segundos => {
        const total = Math.max(0, Math.floor(Number(segundos || 0)));
        return `${String(Math.floor(total / 3600)).padStart(2, '0')}h ${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}m ${String(total % 60).padStart(2, '0')}s`;
    };
    const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const indicatorStart = document.getElementById('indicator-start');
    const indicatorEnd = document.getElementById('indicator-end');
    indicatorStart && (indicatorStart.value = fechaLocal(hoy));
    indicatorEnd && (indicatorEnd.value = fechaLocal(hoy));

    const mostrarDetalle = row => {
        const modal = document.getElementById('modal-detalle-indicador');
        const meta = document.getElementById('indicator-detail-meta');
        const resumen = document.getElementById('indicator-detail-summary');
        const tiempos = document.getElementById('indicator-detail-times');
        const cuerpo = document.getElementById('indicator-detail-rows');
        if (!modal || !meta || !resumen || !tiempos || !cuerpo) return;
        meta.innerHTML = `<span>Fecha: ${formatearFecha(row.date)}</span><strong>Documento: ${escapar(row.agentId)} · ${escapar(row.agent)}</strong>`;
        resumen.innerHTML = `<div><b>${row.effective}</b><small>Efectivos</small></div><div><b>${row.inProgress}</b><small>En proceso</small></div><div><b>${row.unmanaged}</b><small>Sin gestión</small></div><div><b>${row.calls}</b><small>Total llamadas</small></div>`;
        tiempos.innerHTML = `<div><strong>${formatearDuracion(row.adherenceSeconds)}</strong><small>Adherencia al turno</small></div><div><strong>${formatearDuracion(row.conversationSeconds / Math.max(1, row.contacts))}</strong><small>Tiempo de conexión</small></div><div><strong>${formatearDuracion(row.tmoSeconds)}</strong><small>TMO</small></div>`;
        cuerpo.innerHTML = (row.typifications || []).map(item => `<tr><td>${escapar(item.name)}</td><td>${item.effective || 0}</td><td>${item.inProgress || 0}</td><td>${item.unmanaged || 0}</td></tr>`).join('') || '<tr><td colspan="4">No hay tipificaciones para mostrar.</td></tr>';
        modal.hidden = false;
        modal.classList.add('show');
    };
    const cerrarDetalle = () => { const modal = document.getElementById('modal-detalle-indicador'); if (modal) { modal.hidden = true; modal.classList.remove('show'); } };
    document.getElementById('close-detalle-indicador')?.addEventListener('click', cerrarDetalle);

    const renderizar = datos => {
        cuerpoFilas.replaceChildren();
        let calls = 0; let contacts = 0; let effective = 0;
        datos.forEach(item => {
            calls += Number(item.calls || 0); contacts += Number(item.contacts || 0); effective += Number(item.effective || 0);
            const fila = document.createElement('tr');
            fila.dataset.agent = String(item.agentId || '');
            fila.dataset.search = `${item.agent} ${item.date} ${item.agentId}`.toLowerCase();
            fila.innerHTML = `<td>${formatearFecha(item.date)}</td><td><div class="indicator-agent-name"><i></i><div><strong>${escapar(item.agent)}</strong><em>ID: ${escapar(item.agentId)}</em></div></div></td><td class="indicator-number">${item.calls}</td><td>${formatearDuracion(item.adherenceSeconds)}</td><td>${formatearDuracion(item.conversationSeconds / Math.max(1, item.contacts))}</td><td>${formatearDuracion(item.tmoSeconds)}</td><td><button type="button" class="btn-action btn-ver-indicador">Ver más</button></td>`;
            fila.querySelector('.btn-ver-indicador').addEventListener('click', () => mostrarDetalle(item));
            cuerpoFilas.appendChild(fila);
        });
        document.getElementById('metric-calls').textContent = calls;
        document.getElementById('metric-contacts').textContent = contacts;
        document.getElementById('metric-effective').textContent = effective;
        if (!datos.length) cuerpoFilas.innerHTML = '<tr><td colspan="7" class="empty-table-state">No hay indicadores para mostrar.</td></tr>';
    };
    const filtrar = () => {
        let conteo = 0;
        [...cuerpoFilas.querySelectorAll('tr')].forEach(fila => {
            const visible = (agente.value === 'all' || fila.dataset.agent === agente.value) && (!busqueda.value.trim() || fila.dataset.search.includes(busqueda.value.trim().toLowerCase()));
            fila.hidden = !visible;
            if (visible) conteo++;
        });
        if (resultado) resultado.textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
    };
    const cargar = async () => {
        cuerpoFilas.replaceChildren();
        try {
            const params = new URLSearchParams();
            if (indicatorStart?.value) params.set('start', indicatorStart.value);
            if (indicatorEnd?.value) params.set('end', indicatorEnd.value);
            const response = await fetch(`/api/indicadores?${params}`);
            if (!response.ok) throw new Error('No se pudieron cargar los indicadores');
            const payload = await response.json();
            renderizar(payload.data || []);
            filtrar();
        } catch (error) { console.error(error); }
    };
    const cargarAgentes = async () => {
        const response = await fetch('/api/asesores');
        if (!response.ok) throw new Error('No se pudieron cargar los agentes');
        const payload = await response.json();
        const agents = [...new Map((payload.data || []).map(item => [String(item.id), item])).values()];
        agente.replaceChildren(new Option('-- Todos los Agentes --', 'all'), ...agents.map(item => new Option(item.name, item.id)));
    };
    indicatorStart?.addEventListener('change', cargar);
    indicatorEnd?.addEventListener('change', cargar);
    agente.addEventListener('change', filtrar);
    busqueda.addEventListener('input', filtrar);
    cargar();
    cargarAgentes().catch(console.error);
});
