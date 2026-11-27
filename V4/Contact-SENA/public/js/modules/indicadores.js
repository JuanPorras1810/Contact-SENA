document.addEventListener('DOMContentLoaded', () => {
    const cuerpoFilas = document.getElementById('indicator-rows');
    const agente = document.getElementById('indicator-agent');
    const busqueda = document.getElementById('indicator-agent-search');
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
    let agentesDisponibles = [];
    indicatorStart && (indicatorStart.value = fechaLocal(hoy));
    indicatorEnd && (indicatorEnd.value = fechaLocal(hoy));

    const mostrarDetalle = row => {
        const modal = document.getElementById('modal-detalle-indicador');
        const meta = document.getElementById('indicator-detail-meta');
        const tiempos = document.getElementById('indicator-detail-times');
        const cantidadTipificaciones = document.getElementById('indicator-detail-typification-count');
        const tipificaciones = document.getElementById('indicator-detail-typifications');
        if (!modal || !meta || !tiempos || !cantidadTipificaciones || !tipificaciones) return;
        meta.innerHTML = `<span>Fecha: ${formatearFecha(row.date)}</span><strong>${escapar(row.agentId)} · ${escapar(row.agent)}</strong>`;
        tiempos.innerHTML = `<div><strong>${formatearDuracion(row.adherenceSeconds)}</strong><small>Adherencia al turno</small></div><div><strong>${formatearDuracion(row.conversationSeconds)}</strong><small>Tiempo de conexión</small></div><div><strong>${formatearDuracion(row.tmoSeconds)}</strong><small>TMO</small></div>`;
        const elementos = row.typifications || [];
        const totales = elementos.reduce((acc, item) => {
            const efectivos = Number(item.effective || 0);
            const enProceso = Number(item.inProgress || 0);
            const sinGestion = Number(item.unmanaged || 0);
            acc.effective += efectivos;
            acc.inProgress += enProceso;
            acc.unmanaged += sinGestion;
            return acc;
        }, { effective: 0, inProgress: 0, unmanaged: 0 });
        const totalGestiones = totales.effective + totales.inProgress + totales.unmanaged;
        cantidadTipificaciones.textContent = `Total: ${elementos.length} ${elementos.length === 1 ? 'tipificación' : 'tipificaciones'}`;
        tipificaciones.innerHTML = elementos.map(item => {
            const efectivos = Number(item.effective || 0);
            const enProceso = Number(item.inProgress || 0);
            const sinGestion = Number(item.unmanaged || 0);
            const cantidad = efectivos + enProceso + sinGestion;
            const porcentaje = totalGestiones ? Math.round((cantidad / totalGestiones) * 100) : 0;
            const estado = efectivos > 0 ? 'Efectiva' : enProceso > 0 ? 'En proceso' : 'Sin gestión';
            const claseEstado = efectivos > 0 ? 'effective' : enProceso > 0 ? 'in-progress' : 'unmanaged';
            return `<div class="indicator-typification-item">
                <div class="indicator-typification-heading"><strong>${escapar(item.name)}</strong><span class="indicator-typification-status ${claseEstado}">${estado}</span></div>
                <div class="indicator-typification-amount">${cantidad} ${cantidad === 1 ? 'gestión' : 'gestiones'} <span>${porcentaje}% del total</span></div>
                <div class="indicator-typification-track" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapar(item.name)}: ${porcentaje}% del total"><span style="width:${porcentaje}%"></span></div>
            </div>`;
        }).join('') || '<p class="indicator-typification-empty">No hay tipificaciones para mostrar.</p>';
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
            fila.innerHTML = `<td>${formatearFecha(item.date)}</td><td><div class="indicator-agent-name"><i></i><div><strong>${escapar(item.agent)}</strong><em>ID: ${escapar(item.agentId)}</em></div></div></td><td class="indicator-number">${item.calls}</td><td>${formatearDuracion(item.adherenceSeconds)}</td><td>${formatearDuracion(item.conversationSeconds)}</td><td>${formatearDuracion(item.tmoSeconds)}</td><td><button type="button" class="btn-action btn-ver-indicador">Ver más</button></td>`;
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
        const texto = agente.value !== 'all' ? '' : busqueda.value.trim().toLowerCase();
        [...cuerpoFilas.querySelectorAll('tr')].forEach(fila => {
            const visible = (agente.value === 'all' || fila.dataset.agent === agente.value) && (!texto || fila.dataset.search.includes(texto));
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
        agentesDisponibles = [...new Map((payload.data || []).map(item => [String(item.id), item])).values()];
    };
    window.ContactSena?.autocomplete?.({
        input: document.getElementById('indicator-agent-search'),
        hidden: agente,
        list: document.getElementById('indicator-agent-suggestions'),
        items: () => agentesDisponibles,
        text: item => `${item.id} - ${item.name}`,
        value: item => item.id,
        onSelect: item => { if (!item) agente.value = 'all'; filtrar(); }
    });
    indicatorStart?.addEventListener('change', cargar);
    indicatorEnd?.addEventListener('change', cargar);
    busqueda.addEventListener('input', filtrar);
    cargar();
    cargarAgentes().catch(console.error);
});
