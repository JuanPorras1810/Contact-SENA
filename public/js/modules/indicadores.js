document.addEventListener('DOMContentLoaded', () => {
    const cuerpoFilas = document.getElementById('indicator-rows');
    const agente = document.getElementById('indicator-agent');
    const busqueda = document.getElementById('indicator-search-input');
    const resultado = document.getElementById('indicator-results');
    if (!cuerpoFilas || !agente || !busqueda) return;
    const hoy = new Date(); const fechaLocal = valor => `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
    const indicatorStart = document.getElementById('indicator-start'); const indicatorEnd = document.getElementById('indicator-end');
    if (indicatorStart) indicatorStart.value = fechaLocal(hoy); if (indicatorEnd) indicatorEnd.value = fechaLocal(hoy);

    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const configurarTarjetas = () => {
        const contenedor = document.querySelector('.indicator-metrics');
        const tarjetas = [...document.querySelectorAll('.indicator-metric')];
        if (contenedor && tarjetas.length < 4) contenedor.appendChild(tarjetas[2].cloneNode(true));
        const tarjetasFinales = [...document.querySelectorAll('.indicator-metric')];
        tarjetasFinales[2]?.classList.remove('metric-purple'); tarjetasFinales[2]?.classList.add('metric-orange');
        [['CANTIDAD DE CONTACTOS', 'metric-contacts', 'Interacción con el cliente'], ['CASOS RESUELTOS', 'metric-resolved', 'Cerrado'], ['CASOS EN PROCESO', 'metric-open', 'Abierto'], ['CASOS SIN GESTIÓN', 'metric-escalated', 'Escalado']].forEach(([titulo, id, detalle], indice) => {
            const tarjeta = tarjetasFinales[indice];
            if (!tarjeta) return;
            tarjeta.querySelector('span').textContent = titulo;
            tarjeta.querySelector('strong').id = id;
            tarjeta.querySelector('small').textContent = detalle;
        });
    };
    const limpiarMetricas = () => ['metric-contacts', 'metric-resolved', 'metric-open', 'metric-escalated'].forEach(identificador => { const elemento = document.getElementById(identificador); if (elemento) elemento.textContent = '0'; });
    const renderizar = datos => {
        cuerpoFilas.replaceChildren();
        let llamadas = 0; let resueltos = 0; let enProceso = 0; let sinGestion = 0;
        datos.forEach(elemento => {
            llamadas += Number(elemento.interactions || 0); resueltos += Number(elemento.resolved || 0); enProceso += Number(elemento.inProgress || 0); sinGestion += Number(elemento.unmanaged || 0);
            const fila = document.createElement('tr');
            fila.dataset.agent = String(elemento.agentId || '');
            fila.dataset.search = `${elemento.agent} ${elemento.date} ${elemento.agentId}`.toLowerCase();
            const formatearDuracion = segundos => { const total = Math.max(0, Math.floor(Number(segundos || 0))); const horas = Math.floor(total / 3600); const minutos = Math.floor((total % 3600) / 60); const segundosRestantes = total % 60; return `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundosRestantes).padStart(2, '0')}s`; };
            fila.innerHTML = `<td>${formatearFecha(elemento.date)}</td><td><div class="indicator-agent-name"><i></i><div><strong>${elemento.agent || ''}</strong><em>ID: ${elemento.agentId || ''}</em></div></div></td><td class="indicator-number">${elemento.interactions || 0}</td><td>${formatearDuracion(elemento.connectionSeconds)}</td><td><span class="indicator-badge badge-resolved">${elemento.resolved || 0} Cerrado</span></td><td><span class="indicator-badge badge-process">${elemento.inProgress || 0} Abierto</span></td><td><span class="indicator-badge badge-unmanaged">${elemento.unmanaged || 0} Escalado</span></td><td>${formatearDuracion(elemento.averageSeconds)}</td>`;
            cuerpoFilas.appendChild(fila);
        });
        const metricas = { 'metric-contacts': llamadas, 'metric-resolved': resueltos, 'metric-open': enProceso, 'metric-escalated': sinGestion };
        Object.entries(metricas).forEach(([identificador, valor]) => { const elemento = document.getElementById(identificador); if (elemento) elemento.textContent = valor; });
        if (!datos.length) cuerpoFilas.innerHTML = '<tr><td colspan="8" class="empty-table-state">No hay indicadores para mostrar.</td></tr>';
    };
    const filtrar = () => { let conteo = 0; [...cuerpoFilas.querySelectorAll('tr')].forEach(fila => { const visible = (agente.value === 'all' || fila.dataset.agent === agente.value) && (!busqueda.value.trim() || fila.dataset.search.includes(busqueda.value.trim().toLowerCase())); fila.hidden = !visible; if (visible) conteo++; }); if (resultado) resultado.textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`; };
    const cargar = async () => {
        cuerpoFilas.replaceChildren();
        limpiarMetricas();
        try {
            const start = document.getElementById('indicator-start')?.value;
            const end = document.getElementById('indicator-end')?.value;
            const params = new URLSearchParams(); if (start) params.set('start', start); if (end) params.set('end', end);
            const respuesta = await fetch(`/api/indicadores?${params}`);
            if (!respuesta.ok) throw new Error('No se pudieron cargar los indicadores');
            const datosRespuesta = await respuesta.json();
            renderizar(datosRespuesta.data || []);
            filtrar();
        } catch (error) { console.error(error); filtrar(); }
    };
    const cargarAgentes = async () => {
        const respuesta = await fetch('/api/asesores');
        if (!respuesta.ok) throw new Error('No se pudieron cargar los agentes');
        const datos = await respuesta.json();
        const agentes = [...new Map((datos.data || []).map(item => [String(item.id), item])).values()];
        agente.replaceChildren(new Option('-- Todos los Agentes --', 'all'), ...agentes.map(item => new Option(item.name, item.id)));
    };
    configurarTarjetas(); document.getElementById('indicator-start')?.addEventListener('change', cargar); document.getElementById('indicator-end')?.addEventListener('change', cargar); agente.addEventListener('change', filtrar); busqueda.addEventListener('input', filtrar); cargar();
    cargarAgentes().catch(error => console.error(error));
});
