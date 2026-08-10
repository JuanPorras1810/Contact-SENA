(() => {
    'use strict';

    const seleccionar = (selector, raiz = document) => raiz.querySelector(selector);
    const seleccionarTodos = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
    const $ = seleccionar;
    const $$ = seleccionarTodos;
    let usuarioEnMemoria = null;
    const cargarSesion = async () => { try { const response = await fetch('/api/auth/session'); if (!response.ok) return null; const payload = await response.json(); usuarioEnMemoria = payload.user || null; return usuarioEnMemoria; } catch { return null; } };
    const sesionLista = cargarSesion();
    const obtenerUsuarioAlmacenado = () => usuarioEnMemoria;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        init = { ...init, credentials: init.credentials || 'same-origin' };
        return nativeFetch(input, init);
    };
    const enforceModuleRole = async () => {
        const user = await sesionLista;
        const path = window.location.pathname.toLowerCase();
        const expectedRole = path.includes('/modulos/supervisor/') ? 'supervisor' : path.includes('/modulos/agente/') ? 'agente' : null;
        if (expectedRole && (!user || user.role !== expectedRole)) window.location.href = '../../Index.html';
    };
    const aplicarPerfilAlmacenado = () => {
        const user = obtenerUsuarioAlmacenado();
        if (!user) return;
        seleccionarTodos('.user-info h4').forEach(elemento => { elemento.textContent = user.name || 'Usuario'; });
        seleccionarTodos('.user-avatar').forEach(imagen => { if (user.photo) imagen.src = user.photo; imagen.alt = `Avatar de ${user.name || 'usuario'}`; });
        seleccionarTodos('.avatar-preview-circle').forEach(imagen => { if (user.photo) imagen.src = user.photo; imagen.alt = `Foto de perfil de ${user.name || 'usuario'}`; });
    };
    const actualizarPerfilAlmacenado = async () => {
        const user = await sesionLista;
        if (!user?.id || !user?.role) return;
        try {
            const response = await fetch(`/api/auth/profile?id=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role)}`);
            if (!response.ok) return;
            const payload = await response.json();
            usuarioEnMemoria = payload.user || null;
            aplicarPerfilAlmacenado();
        } catch { /* The cached profile remains available while the API is offline. */ }
    };

    const cerrarModalesVisibles = () => {
        $$('.modal-overlay.show, .campaign-modal-overlay:not([hidden]), .client-modal-overlay:not([hidden])').forEach(modal => {
            borrarBorradoresDelModal(modal);
            modal.classList.remove('show');
            modal.hidden = true;
        });
        document.body.classList.remove('modal-open');
    };

    const inicializarNavegacion = () => {
        aplicarPerfilAlmacenado();
        const sidebar = $('#main-sidebar');
        const overlay = $('#sidebar-overlay');
        const hamburger = $('#btn-hamburger');
        if (hamburger && sidebar && overlay) {
            const sidebarStateKey = 'contact-sena-sidebar-open';
            const isMobile = () => window.matchMedia('(max-width: 992px)').matches;
            const readSidebarState = () => { try { return sessionStorage.getItem(sidebarStateKey); } catch { return null; } };
            const writeSidebarState = open => { try { if (open) sessionStorage.setItem(sidebarStateKey, 'true'); else sessionStorage.removeItem(sidebarStateKey); } catch { /* Storage can be unavailable in restricted browsers. */ } };
            const setSidebarState = open => {
                sidebar.classList.toggle('show', open);
                overlay.classList.toggle('show', open);
                document.documentElement.classList.toggle('sidebar-should-open', open);
                hamburger.setAttribute('aria-expanded', String(open));
                if (open && isMobile()) writeSidebarState(true);
                if (!open) writeSidebarState(false);
            };

            if (isMobile() && readSidebarState() === 'true') {
                sidebar.classList.add('sidebar-restored');
                setSidebarState(true);
                requestAnimationFrame(() => sidebar.classList.remove('sidebar-restored'));
            }
            hamburger.setAttribute('aria-expanded', String(sidebar.classList.contains('show')));
            hamburger.addEventListener('click', () => setSidebarState(!sidebar.classList.contains('show')));
            overlay.addEventListener('click', () => setSidebarState(false));
            $$('.sidebar-link', sidebar).forEach(link => link.addEventListener('click', () => {
                if (isMobile()) writeSidebarState(true);
            }));
        }

        const user = $('#sidebar-user-trigger');
        const popover = $('#user-popover-menu');
        if (user && popover) {
            const toggle = () => { popover.classList.toggle('show'); user.classList.toggle('active'); user.setAttribute('aria-expanded', popover.classList.contains('show')); };
            user.addEventListener('click', event => { event.stopPropagation(); toggle(); });
            user.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
            document.addEventListener('click', event => { if (!user.contains(event.target) && !popover.contains(event.target)) { popover.classList.remove('show'); user.classList.remove('active'); } });
        }
    };

    const inicializarControlesModal = () => {
        $$('[data-modal-open]').forEach(button => button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.modalOpen);
            if (modal) { modal.hidden = false; modal.classList.add('show'); document.body.classList.add('modal-open'); }
        }));
        $$('[data-modal-close]').forEach(button => button.addEventListener('click', cerrarModalesVisibles));
        document.addEventListener('keydown', event => { if (event.key === 'Escape') cerrarModalesVisibles(); });
    };

    const inicializarModalUsuario = () => {
        const trigger = $('#item-actualizar-datos');
        const modal = $('#modal-actualizar-datos');
        if (!trigger || !modal) return;
        const close = () => modal.classList.remove('show');
        const profileForm = $('.dark-form', modal);
        const profileSelects = $$('select', profileForm || modal);
        const profileInputs = $$('input', profileForm || modal);
        if (profileInputs.length >= 6) {
            profileInputs[1].id = 'agente-nombre';
            profileInputs[2].id = 'agente-correo';
            profileInputs[3].id = 'agente-direccion';
            profileInputs[4].id = 'agente-telefono';
            profileInputs[5].id = 'agente-telefono-alt';
            profileInputs[4].type = 'tel';
            profileInputs[5].type = 'tel';
            profileInputs[4].inputMode = 'numeric';
            profileInputs[5].inputMode = 'numeric';
        }
        const cargarGeografia = async datosUsuario => {
            try {
                const response = await fetch('/api/catalogos/geografia');
                if (!response.ok) return;
                const data = await response.json();
                const establecerOpciones = (selector, elementos, seleccionado) => { if (!selector) return; selector.replaceChildren(...elementos.map(elemento => new Option(elemento.name, elemento.id))); if (seleccionado) selector.value = String(seleccionado); };
                establecerOpciones(profileSelects[0], data.departments, datosUsuario?.departmentId);
                const municipios = data.municipalities.filter(elemento => !datosUsuario?.departmentId || elemento.departmentId === Number(datosUsuario.departmentId));
                establecerOpciones(profileSelects[1], municipios, datosUsuario?.municipalityId);
                establecerOpciones(profileSelects[2], data.neighborhoods.filter(elemento => !datosUsuario?.municipalityId || elemento.municipalityId === Number(datosUsuario.municipalityId)), datosUsuario?.neighborhoodId);
                profileSelects[0]?.addEventListener('change', () => { establecerOpciones(profileSelects[1], data.municipalities.filter(elemento => elemento.departmentId === Number(profileSelects[0].value))); establecerOpciones(profileSelects[2], data.neighborhoods.filter(elemento => elemento.municipalityId === Number(profileSelects[1].value))); });
                profileSelects[1]?.addEventListener('change', () => establecerOpciones(profileSelects[2], data.neighborhoods.filter(elemento => elemento.municipalityId === Number(profileSelects[1].value))));
            } catch { /* The form keeps its local options if the API is unavailable. */ }
        };
        const open = () => {
            const userData = obtenerUsuarioAlmacenado();
            const inputs = profileInputs;
            const selects = profileSelects;
            if (userData && inputs.length >= 3) {
                inputs[0].value = userData.photo || '';
                inputs[1].value = userData.name || '';
                inputs[2].value = userData.email || '';
                inputs[3].value = userData.address || '';
                inputs[4].value = userData.phone || '';
                inputs[5].value = userData.phoneAlt || '';
                if (selects[2] && userData.neighborhoodId) selects[2].selectedIndex = Number(userData.neighborhoodId) - 1;
                const preview = $('.avatar-preview-circle', modal);
                if (preview && userData.photo) preview.src = userData.photo;
            }
            if (profileForm) {
                const requiredFields = profileInputs.slice(1, 5).concat(profileSelects.slice(2, 3));
                requiredFields.forEach(field => field.required = true);
            }
            cargarGeografia(userData);
            modal.classList.add('show'); const popover = $('#user-popover-menu'); if (popover) popover.classList.remove('show');
        };
        trigger.addEventListener('click', open);
        trigger.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        $('#close-actualizar')?.addEventListener('click', close);
        $('#btn-cancelar-actualizar')?.addEventListener('click', close);
        profileForm?.addEventListener('submit', async event => {
            event.preventDefault();
            if (window.Validaciones && !window.Validaciones.validarFormulario(profileForm)) return;
            const userData = obtenerUsuarioAlmacenado();
            const inputs = $$('input', profileForm);
            const selects = $$('select', profileForm);
            const body = { id: userData?.id, role: userData?.role, photo: inputs[0]?.value.trim(), name: inputs[1]?.value.trim(), email: inputs[2]?.value.trim(), address: inputs[3]?.value.trim(), phone: inputs[4]?.value.trim(), phoneAlt: inputs[5]?.value.trim(), neighborhoodId: selects[2]?.selectedIndex + 1 };
            try {
                const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error || 'No se pudieron actualizar los datos');
                 if (userData) { Object.assign(userData, { name: body.name, email: body.email, address: body.address, phone: body.phone, phoneAlt: body.phoneAlt, neighborhoodId: body.neighborhoodId, photo: body.photo }); usuarioEnMemoria = userData; aplicarPerfilAlmacenado(); }
                close();
                alert(payload.message);
            } catch (error) { alert(error.message); }
        });
        const logout = $('.popover-item.logout');
        if (logout) logout.addEventListener('click', async () => { const userData = obtenerUsuarioAlmacenado(); try { if (userData) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userData.id, role: userData.role }) }); } finally { usuarioEnMemoria = null; window.location.href = '../../Index.html'; } });
    };

    const inicializarCamposFecha = () => {
        const calendarPath = 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z';
        $$('input[type="date"]').forEach(input => {
            if (input.closest('.input-date-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'input-date-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', calendarPath);
            svg.appendChild(path);
            wrapper.appendChild(svg);
        });
    };

    const inicializarSelectoresFecha = () => $$('.input-date-wrapper').forEach(wrapper => wrapper.addEventListener('click', () => {
        const input = $('input[type="date"]', wrapper);
        if (input && typeof input.showPicker === 'function') input.showPicker();
    }));

    const inicializarAccesibilidadFormularios = () => {
        const instrucciones = {
            'time-search': 'Buscar...',
            'history-search': 'Buscar...',
            'indicator-search-input': 'Buscar...',
            'contact-observation': 'Describe el resultado de la gestión',
            'contact-case-comment': 'Describe el caso y los detalles del escalamiento'
        };
        const normalizarCampos = (campos, claveFormulario) => campos.forEach((campo, indiceCampo) => {
            campo.autocomplete = 'off';
            if (!campo.id) campo.id = `${claveFormulario}-field-${indiceCampo + 1}`;
            if (!campo.name) campo.name = campo.id;
            if (instrucciones[campo.id]) campo.placeholder = instrucciones[campo.id];
            if (campo.placeholder === 'Buscar en contactos...') campo.placeholder = 'Buscar...';
            const contenedor = campo.closest('.form-group, .input-group, .client-form-field, .campaign-form-group, .filter-group, .filter-search-group, .indicator-filter, .indicator-search, .supervisor-date-filter, .supervisor-agent-filter, .supervisor-text-search');
            const etiqueta = contenedor && $('label', contenedor);
            if (etiqueta && !etiqueta.contains(campo) && !etiqueta.htmlFor) etiqueta.htmlFor = campo.id;
            if (!etiqueta && !campo.closest('label')) {
                const etiquetaOculta = document.createElement('label');
                etiquetaOculta.className = 'visually-hidden';
                etiquetaOculta.htmlFor = campo.id;
                etiquetaOculta.textContent = campo.getAttribute('aria-label') || campo.placeholder || campo.name;
                campo.parentNode.insertBefore(etiquetaOculta, campo);
            }
        });
        $$('form').forEach((formulario, indiceFormulario) => {
            formulario.autocomplete = 'off';
            const claveFormulario = (formulario.id || `form-${indiceFormulario}`).replace(/[^a-zA-Z0-9_-]/g, '-');
            normalizarCampos($$('input, select, textarea', formulario), claveFormulario);
        });
        normalizarCampos($$('input, select, textarea').filter(campo => !campo.form), 'page');
    };

    window.ContactSena = { $, $$, closeVisibleModals: cerrarModalesVisibles, get user() { return usuarioEnMemoria; }, ready: sesionLista };
    document.addEventListener('DOMContentLoaded', () => { enforceModuleRole(); inicializarNavegacion(); inicializarControlesModal(); inicializarModalUsuario(); inicializarCamposFecha(); inicializarSelectoresFecha(); inicializarAccesibilidadFormularios(); actualizarPerfilAlmacenado(); });
})();
