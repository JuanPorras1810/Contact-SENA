document.addEventListener('DOMContentLoaded', () => {
    const tablaContactos = document.getElementById('contacts-table') || document.getElementById('table-contacts');
    const tablaCasos = document.getElementById('tickets-table') || document.getElementById('table-tickets');
    const pestanaContactos = document.getElementById('contacts-tab') || document.getElementById('btn-contacts');
    const pestanaCasos = document.getElementById('tickets-tab') || document.getElementById('btn-tickets');
    const busqueda = document.getElementById('history-agent-search') || document.querySelector('.filter-search-group input');
    const criterio = document.getElementById('history-search-type') || { value: 'agent', addEventListener() {} };
    const sugerencias = document.getElementById('history-agent-suggestions');
    const limpiar = document.getElementById('history-search-clear');
    const controlBusqueda = document.getElementById('history-search-control');
    const resultado = document.getElementById('history-results');
    if (!tablaContactos || !tablaCasos || !pestanaContactos || !pestanaCasos || !busqueda) return;

    const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]));
    const formatearFecha = valor => valor ? new Date(`${String(valor).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const clienteId = item => item.clientId ?? item.client?.id ?? '';
    const clienteNombre = item => item.clientName ?? (typeof item.client === 'string' ? item.client : item.client?.name) ?? '';
    const today = new Date();
    const localDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const startField = document.getElementById('history-start') || document.getElementById('fecha-inicio');
    const endField = document.getElementById('history-end') || document.getElementById('fecha-fin');
    if (startField) startField.value = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
    if (endField) endField.value = localDate(today);
    let contactos = [];
    let tickets = [];
    let seleccion = null;
    const esContactos = () => !tablaContactos.classList.contains('hidden');
    const filasActivas = () => [...(esContactos() ? tablaContactos : tablaCasos).querySelectorAll('tbody tr')];
    const cuerpoDe = tabla => tabla?.tagName === 'TABLE' ? tabla.tBodies[0] : tabla?.querySelector('tbody');
    const textoCriterio = () => criterio.value;

    const renderSugerencias = () => {
        const termino = busqueda.value.trim().toLocaleLowerCase('es');
        const tipo = textoCriterio();
        const origen = esContactos() ? contactos : tickets;
        const unico = new Map();
        origen.forEach(item => {
            const id = tipo === 'agent' ? item.agentId : tipo === 'client' ? clienteId(item) : item.id;
            const nombre = tipo === 'agent' ? item.agent : tipo === 'client' ? clienteNombre(item) : '';
            if (id === '' || id === null || id === undefined) return;
            const etiqueta = tipo === 'agent' ? `${id} - ${nombre || 'Agente'}` : tipo === 'client' ? `Cliente #${id} - ${nombre || 'Cliente'}` : `#${id}`;
            const clave = String(id);
            const buscable = `${id} ${nombre || ''}`.toLocaleLowerCase('es');
            if (!termino || buscable.includes(termino.replace(/^#/, ''))) unico.set(clave, { id: clave, etiqueta });
        });
        if (!sugerencias) return;
        sugerencias.replaceChildren();
        [...unico.values()].forEach(item => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'autocomplete-suggestion';
            boton.setAttribute('role', 'option');
            boton.textContent = item.etiqueta;
            boton.addEventListener('click', () => {
                seleccion = { tipo, id: item.id };
                busqueda.value = item.etiqueta;
                actualizarLimpiar();
                ocultarSugerencias();
                filtrar();
            });
            sugerencias.appendChild(boton);
        });
        sugerencias.hidden = !sugerencias.children.length;
        busqueda.setAttribute('aria-expanded', String(!sugerencias.hidden));
    };
    const ocultarSugerencias = () => {
        if (sugerencias) sugerencias.hidden = true;
        busqueda.setAttribute('aria-expanded', 'false');
    };
    const actualizarLimpiar = () => { if (limpiar) limpiar.hidden = !busqueda.value; };
    const filtrar = () => {
        const termino = busqueda.value.trim().toLocaleLowerCase('es').replace(/^#/, '');
        const tipo = textoCriterio();
        let conteo = 0;
        filasActivas().forEach(fila => {
            const vacia = Boolean(fila.querySelector('.empty-table-state'));
            let coincide = !termino;
            if (seleccion) coincide = fila.dataset[`${seleccion.tipo}Id`] === seleccion.id;
            else if (termino) {
                const id = fila.dataset[`${tipo}Id`] || '';
                const nombre = fila.dataset[`${tipo}Name`] || '';
                coincide = /^\d+$/.test(termino) || tipo === 'code' ? id === termino : nombre.includes(termino) || id.toLocaleLowerCase('es').includes(termino);
            }
            fila.hidden = !vacia && !coincide;
            if (!fila.hidden && !vacia) conteo++;
        });
        if (resultado) resultado.textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
    };
    const marcarCliente = elemento => {
        const id = clienteId(elemento);
        const nombre = clienteNombre(elemento);
        return id === '' ? escaparHtml(nombre || 'Cliente') : `<span class="client-reference"><strong>Cliente #${escaparHtml(id)}</strong>${nombre ? `<small>${escaparHtml(nombre)}</small>` : ''}</span>`;
    };
    const marcarAgente = elemento => `<span class="client-reference"><strong>${escaparHtml(elemento.agent || 'Agente')}</strong><small>ID: ${escaparHtml(elemento.agentId || '')}</small></span>`;

    const cargarHistorial = async () => {
        try {
            const usuario = await window.ContactSena?.ready.then(() => window.ContactSena.user).catch(() => null);
            const esAgente = usuario?.role === 'agente';
            const parametros = new URLSearchParams();
            if (startField?.value) parametros.set('start', startField.value);
            if (endField?.value) parametros.set('end', endField.value);
            const url = esAgente ? `/api/historial/agente?agentId=${encodeURIComponent(usuario.id)}&${parametros}` : `/api/historial?${parametros}`;
            const respuesta = await fetch(url);
            if (!respuesta.ok) throw new Error('No se pudo cargar el historial');
            const datos = await respuesta.json();
            contactos = datos.contacts || [];
            tickets = datos.tickets || [];
            const cuerpoContactos = cuerpoDe(tablaContactos);
            const cuerpoTickets = cuerpoDe(tablaCasos);
            cuerpoContactos.replaceChildren();
            cuerpoTickets.replaceChildren();
            contactos.forEach((item, indice) => {
                const fila = document.createElement('tr');
                fila.dataset.agentId = String(item.agentId ?? '');
                fila.dataset.agentName = String(item.agent || '').toLocaleLowerCase('es');
                fila.dataset.clientId = String(clienteId(item));
                fila.dataset.clientName = String(clienteNombre(item)).toLocaleLowerCase('es');
                fila.dataset.codeId = String(item.id ?? '');
                fila.innerHTML = esAgente
                    ? `<td><strong class="cod-blue">#${escaparHtml(item.id || indice + 1)}</strong></td><td>${formatearFecha(item.date)}</td><td class="col-cliente">${marcarCliente(item)}</td><td><span class="col-campana">${escaparHtml(item.campaign || item.reason)}</span></td><td>${escaparHtml(item.observation)}</td><td><span class="col-estado">${escaparHtml(item.status)}</span></td>`
                    : `<td><strong class="cod-blue">#${escaparHtml(item.id || indice + 1)}</strong></td><td>${formatearFecha(item.date)}</td><td>${marcarAgente(item)}</td><td class="col-cliente">${marcarCliente(item)}</td><td><span class="col-campana">${escaparHtml(item.campaign || item.reason)}</span></td><td>${escaparHtml(item.observation)}</td><td><span class="col-estado">${escaparHtml(item.status)}</span></td>`;
                cuerpoContactos.appendChild(fila);
            });
            tickets.forEach(item => {
                const fila = document.createElement('tr');
                fila.dataset.agentId = String(item.agentId ?? '');
                fila.dataset.agentName = String(item.agent || '').toLocaleLowerCase('es');
                fila.dataset.clientId = String(clienteId(item));
                fila.dataset.clientName = String(clienteNombre(item)).toLocaleLowerCase('es');
                fila.dataset.codeId = String(item.id ?? '');
                fila.innerHTML = esAgente
                    ? `<td><strong class="cod-blue">#${escaparHtml(item.id)}</strong></td><td>${formatearFecha(item.startDate)}</td><td>${item.endDate ? formatearFecha(item.endDate) : 'Abierto'}</td><td>${escaparHtml(item.comment || item.reason)}</td>`
                    : `<td><strong class="cod-blue">#${escaparHtml(item.id)}</strong></td><td>${marcarAgente(item)}</td><td>${formatearFecha(item.startDate)}</td><td>${item.endDate ? formatearFecha(item.endDate) : 'Abierto'}</td><td>${escaparHtml(item.comment || item.reason)}</td>`;
                cuerpoTickets.appendChild(fila);
            });
            filtrar();
            renderSugerencias();
        } catch (error) { console.error(error); }
    };
    const cambiarPestana = mostrarContactos => {
        pestanaContactos.classList.toggle('active', mostrarContactos);
        pestanaCasos.classList.toggle('active', !mostrarContactos);
        tablaContactos.classList.toggle('hidden', !mostrarContactos);
        tablaCasos.classList.toggle('hidden', mostrarContactos);
        seleccion = null;
        filtrar();
        if (document.activeElement === busqueda) renderSugerencias();
    };
    criterio.addEventListener('change', () => {
        seleccion = null;
        busqueda.value = '';
        busqueda.placeholder = criterio.value === 'agent' ? 'Buscar agente por ID o nombre...' : criterio.value === 'client' ? 'Buscar cliente por # o nombre...' : 'Buscar código, por ejemplo #49...';
        actualizarLimpiar();
        filtrar();
        renderSugerencias();
        busqueda.focus();
    });
    busqueda.addEventListener('focus', renderSugerencias);
    busqueda.addEventListener('input', () => {
        seleccion = null;
        actualizarLimpiar();
        filtrar();
        renderSugerencias();
    });
    limpiar?.addEventListener('click', () => {
        seleccion = null;
        busqueda.value = '';
        actualizarLimpiar();
        filtrar();
        ocultarSugerencias();
        busqueda.focus();
    });
    document.addEventListener('click', evento => { if (controlBusqueda && !controlBusqueda.contains(evento.target)) ocultarSugerencias(); });
    pestanaContactos.addEventListener('click', () => cambiarPestana(true));
    pestanaCasos.addEventListener('click', () => cambiarPestana(false));
    startField?.addEventListener('change', cargarHistorial);
    endField?.addEventListener('change', cargarHistorial);
    cargarHistorial();
});
