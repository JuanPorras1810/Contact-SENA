document.addEventListener('DOMContentLoaded', () => {
    const tablaContactos = document.getElementById('contacts-table') || document.getElementById('table-contacts'); const tablaCasos = document.getElementById('tickets-table') || document.getElementById('table-tickets'); const pestanaContactos = document.getElementById('contacts-tab') || document.getElementById('btn-contacts'); const pestanaCasos = document.getElementById('tickets-tab') || document.getElementById('btn-tickets'); const agente = document.getElementById('history-agent'); const busqueda = document.getElementById('history-search') || document.querySelector('.filter-search-group input'); const resultado = document.getElementById('history-results');
    if (!tablaContactos || !tablaCasos || !pestanaContactos || !pestanaCasos) return;
    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const etiquetaCliente = elemento => {
        const id = elemento.clientId ?? elemento.client?.id;
        const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name);
        if (id === undefined || id === null || id === '') return nombre || 'Cliente';
        return `Cliente #${id}${nombre ? ` - ${nombre}` : ''}`;
    };
    const marcarCliente = elemento => { const id = elemento.clientId ?? elemento.client?.id; const nombre = elemento.clientName ?? (typeof elemento.client === 'string' ? elemento.client : elemento.client?.name); if (id === undefined || id === null || id === '') return escaparHtml(nombre || 'Cliente'); return `<span class="client-reference"><strong>Cliente #${escaparHtml(id)}</strong>${nombre ? `<small>${escaparHtml(nombre)}</small>` : ''}</span>`; };
    const marcarAgente = elemento => `<span class="client-reference"><strong>${escaparHtml(elemento.agent || 'Agente')}</strong><small>ID: ${escaparHtml(elemento.agentId || '')}</small></span>`;
    const today = new Date(); const localDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const startField = document.getElementById('history-start') || document.getElementById('fecha-inicio'); const endField = document.getElementById('history-end') || document.getElementById('fecha-fin');
    if (startField) startField.value = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
    if (endField) endField.value = localDate(today);
    const bodyOf = table => table?.tagName === 'TABLE' ? table.tBodies[0] : table?.querySelector('tbody');
    const cargarAgentes = async () => {
        if (!agente) return;
        const respuesta = await fetch('/api/asesores');
        if (!respuesta.ok) throw new Error('No se pudieron cargar los agentes');
        const datos = await respuesta.json();
        const agentes = [...new Map((datos.data || []).map(item => [String(item.id), item])).values()];
        agente.replaceChildren(new Option('-- Todos los Agentes --', 'all'), ...agentes.map(item => new Option(item.name, item.id)));
    };
    const cargarHistorial = async () => {
        try {
            const usuarioActual = await window.ContactSena?.ready.then(() => window.ContactSena.user).catch(() => null);
            const esAgente = !document.getElementById('history-agent') && usuarioActual?.role === 'agente';
            const inicio = startField?.value;
            const fin = endField?.value;
            const parametros = new URLSearchParams(); if (inicio) parametros.set('start', inicio); if (fin) parametros.set('end', fin);
            const respuesta = await fetch(esAgente ? `/api/historial/agente?agentId=${encodeURIComponent(usuarioActual.id)}&${parametros}` : `/api/historial?${parametros}`);
            if (!respuesta.ok) throw new Error('No se pudo cargar el historial');
            const datosRespuesta = await respuesta.json();
            const cuerpoContactos = bodyOf(tablaContactos);
            const cuerpoCasos = bodyOf(tablaCasos);
            cuerpoContactos.replaceChildren();
            cuerpoCasos.replaceChildren();
            (datosRespuesta.contacts || []).forEach((elemento, indice) => {
                const fila = document.createElement('tr');
                 fila.dataset.agent = String(elemento.agentId || '');
                 fila.dataset.search = `${elemento.agent} ${etiquetaCliente(elemento)} ${elemento.campaign} ${elemento.reason} ${elemento.typification}`.toLowerCase();
                 fila.innerHTML = esAgente ? `<td><strong class="cod-blue">#${elemento.id || indice + 1}</strong></td><td>${formatearFecha(elemento.date)}</td><td class="col-cliente">${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign || elemento.reason)}</span></td><td>${escaparHtml(elemento.observation)}</td><td><span class="col-estado ${elemento.status === 'Cerrado' ? 'estado-resuelto' : 'estado-pendiente'}">${escaparHtml(elemento.status)}</span></td>` : `<td><strong class="cod-blue">#${elemento.id || indice + 1}</strong></td><td>${formatearFecha(elemento.date)}</td><td>${marcarAgente(elemento)}</td><td class="col-cliente">${marcarCliente(elemento)}</td><td><span class="col-campana">${escaparHtml(elemento.campaign || elemento.reason)}</span></td><td>${escaparHtml(elemento.observation)}</td><td><span class="col-estado ${elemento.status === 'Cerrado' ? 'estado-resuelto' : 'estado-pendiente'}">${escaparHtml(elemento.status)}</span></td>`;
                cuerpoContactos.appendChild(fila);
            });
            (datosRespuesta.tickets || []).forEach(elemento => {
                const fila = document.createElement('tr');
                 fila.dataset.agent = String(elemento.agentId || '');
                fila.dataset.search = `${elemento.agent} ${elemento.reason} ${elemento.comment}`.toLowerCase();
                fila.innerHTML = esAgente ? `<td><strong class="cod-blue">#${elemento.id}</strong></td><td>${formatearFecha(elemento.startDate)}</td><td>${elemento.endDate ? formatearFecha(elemento.endDate) : 'Abierto'}</td><td>${escaparHtml(elemento.comment || elemento.reason)}</td>` : `<td><strong class="cod-blue">#${elemento.id}</strong></td><td>${marcarAgente(elemento)}</td><td>${formatearFecha(elemento.startDate)}</td><td>${elemento.endDate ? formatearFecha(elemento.endDate) : 'Abierto'}</td><td>${escaparHtml(elemento.comment || elemento.reason)}</td>`;
                cuerpoCasos.appendChild(fila);
            });
            if (!cuerpoContactos.children.length) cuerpoContactos.innerHTML = '<tr><td colspan="7" class="empty-table-state">No hay contactos registrados.</td></tr>';
            if (!cuerpoCasos.children.length) cuerpoCasos.innerHTML = '<tr><td colspan="5" class="empty-table-state">No hay tickets registrados.</td></tr>';
            filtrar();
        } catch (error) { bodyOf(tablaContactos)?.replaceChildren(); bodyOf(tablaCasos)?.replaceChildren(); console.error(error); filtrar(); }
    };
    const filtrar = () => { const filas = [...(tablaCasos.classList.contains('hidden') ? tablaContactos : tablaCasos).querySelectorAll('tbody tr')]; let conteo = 0; filas.forEach(fila => { const esVacia = Boolean(fila.querySelector('.empty-table-state')); const visible = esVacia || ((!agente || agente.value === 'all' || fila.dataset.agent === agente.value) && (!busqueda || !busqueda.value.trim() || (fila.dataset.search || fila.textContent).toLowerCase().includes(busqueda.value.trim().toLowerCase()))); fila.hidden = !visible; if (visible && !esVacia) conteo++; }); if (resultado) resultado.textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`; };
    const cambiarPestana = mostrarContactos => { pestanaContactos.classList.toggle('active', mostrarContactos); pestanaCasos.classList.toggle('active', !mostrarContactos); tablaContactos.classList.toggle('hidden', !mostrarContactos); tablaCasos.classList.toggle('hidden', mostrarContactos); if (busqueda) busqueda.placeholder = mostrarContactos ? 'Buscar...' : 'Buscar...'; filtrar(); };
    window.showTab = pestana => cambiarPestana(pestana === 'contacts');
    pestanaContactos.addEventListener('click', () => cambiarPestana(true)); pestanaCasos.addEventListener('click', () => cambiarPestana(false)); agente?.addEventListener('change', filtrar); busqueda?.addEventListener('input', filtrar); document.getElementById('history-start')?.addEventListener('change', cargarHistorial); document.getElementById('history-end')?.addEventListener('change', cargarHistorial); document.getElementById('fecha-inicio')?.addEventListener('change', cargarHistorial); document.getElementById('fecha-fin')?.addEventListener('change', cargarHistorial);
     cargarAgentes().catch(error => console.error(error));
     cargarHistorial();
});
