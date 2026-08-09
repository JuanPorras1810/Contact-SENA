(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const getStoredUser = () => { try { return JSON.parse(localStorage.getItem('contact-sena-user') || 'null'); } catch { return null; } };
    const token = () => localStorage.getItem('contact-sena-token');
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        if (!url.startsWith('/api/auth/login')) {
            const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
            if (token()) headers.set('Authorization', `Bearer ${token()}`);
            init = { ...init, headers };
        }
        return nativeFetch(input, init);
    };
    const enforceModuleRole = () => {
        const user = getStoredUser();
        const path = window.location.pathname.toLowerCase();
        const expectedRole = path.includes('/modulos/supervisor/') ? 'supervisor' : path.includes('/modulos/agente/') ? 'agente' : null;
        if (expectedRole && (!user || user.role !== expectedRole || !token())) window.location.href = '../../Index.html';
    };
    const applyStoredProfile = () => {
        const user = getStoredUser();
        if (!user) return;
        $$('.user-info h4').forEach(element => { element.textContent = user.name || 'Usuario'; });
        $$('.user-avatar').forEach(image => { if (user.photo) image.src = user.photo; image.alt = `Avatar de ${user.name || 'usuario'}`; });
        $$('.avatar-preview-circle').forEach(image => { if (user.photo) image.src = user.photo; image.alt = `Foto de perfil de ${user.name || 'usuario'}`; });
    };
    const refreshStoredProfile = async () => {
        const user = getStoredUser();
        if (!user?.id || !user?.role) return;
        try {
            const response = await fetch(`/api/auth/profile?id=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role)}`);
            if (!response.ok) return;
            const payload = await response.json();
            localStorage.setItem('contact-sena-user', JSON.stringify(payload.user));
            if (payload.token) localStorage.setItem('contact-sena-token', payload.token);
            applyStoredProfile();
        } catch { /* The cached profile remains available while the API is offline. */ }
    };

    const closeVisibleModals = () => {
        $$('.modal-overlay.show, .campaign-modal-overlay:not([hidden]), .client-modal-overlay:not([hidden])').forEach(modal => {
            modal.classList.remove('show');
            modal.hidden = true;
        });
        document.body.classList.remove('modal-open');
    };

    const initNavigation = () => {
        applyStoredProfile();
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

    const initModalControls = () => {
        $$('[data-modal-open]').forEach(button => button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.modalOpen);
            if (modal) { modal.hidden = false; modal.classList.add('show'); document.body.classList.add('modal-open'); }
        }));
        $$('[data-modal-close]').forEach(button => button.addEventListener('click', closeVisibleModals));
        $$('.modal-overlay').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeVisibleModals(); }));
        document.addEventListener('keydown', event => { if (event.key === 'Escape') closeVisibleModals(); });
    };

    const initUserModal = () => {
        const trigger = $('#item-actualizar-datos');
        const modal = $('#modal-actualizar-datos');
        if (!trigger || !modal) return;
        const close = () => modal.classList.remove('show');
        const profileForm = $('.dark-form', modal);
        const profileSelects = $$('select', profileForm || modal);
        const loadGeography = async userData => {
            try {
                const response = await fetch('/api/catalogos/geografia');
                if (!response.ok) return;
                const data = await response.json();
                const setOptions = (select, items, selected) => { if (!select) return; select.replaceChildren(...items.map(item => new Option(item.name, item.id))); if (selected) select.value = String(selected); };
                setOptions(profileSelects[0], data.departments, userData?.departmentId);
                const municipalities = data.municipalities.filter(item => !userData?.departmentId || item.departmentId === Number(userData.departmentId));
                setOptions(profileSelects[1], municipalities, userData?.municipalityId);
                setOptions(profileSelects[2], data.neighborhoods.filter(item => !userData?.municipalityId || item.municipalityId === Number(userData.municipalityId)), userData?.neighborhoodId);
                profileSelects[0]?.addEventListener('change', () => { setOptions(profileSelects[1], data.municipalities.filter(item => item.departmentId === Number(profileSelects[0].value))); setOptions(profileSelects[2], data.neighborhoods.filter(item => item.municipalityId === Number(profileSelects[1].value))); });
                profileSelects[1]?.addEventListener('change', () => setOptions(profileSelects[2], data.neighborhoods.filter(item => item.municipalityId === Number(profileSelects[1].value))));
            } catch { /* The form keeps its local options if the API is unavailable. */ }
        };
        const open = () => {
            const userData = getStoredUser();
            const inputs = $$('input', profileForm || modal);
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
                const requiredFields = $$('input', profileForm).slice(1).filter((input, index) => index < 4).concat($$('select', profileForm).slice(2, 3));
                requiredFields.forEach(field => field.required = true);
            }
            loadGeography(userData);
            modal.classList.add('show'); const popover = $('#user-popover-menu'); if (popover) popover.classList.remove('show');
        };
        trigger.addEventListener('click', open);
        trigger.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        $('#close-actualizar')?.addEventListener('click', close);
        $('#btn-cancelar-actualizar')?.addEventListener('click', close);
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        profileForm?.addEventListener('submit', async event => {
            event.preventDefault();
            const userData = getStoredUser();
            const inputs = $$('input', profileForm);
            const selects = $$('select', profileForm);
            const body = { id: userData?.id, role: userData?.role, photo: inputs[0]?.value.trim(), name: inputs[1]?.value.trim(), email: inputs[2]?.value.trim(), address: inputs[3]?.value.trim(), phone: inputs[4]?.value.trim(), phoneAlt: inputs[5]?.value.trim(), neighborhoodId: selects[2]?.selectedIndex + 1 };
            try {
                const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error || 'No se pudieron actualizar los datos');
                if (userData) { Object.assign(userData, { name: body.name, email: body.email, address: body.address, phone: body.phone, phoneAlt: body.phoneAlt, neighborhoodId: body.neighborhoodId, photo: body.photo }); localStorage.setItem('contact-sena-user', JSON.stringify(userData)); applyStoredProfile(); }
                close();
                alert(payload.message);
            } catch (error) { alert(error.message); }
        });
        const logout = $('.popover-item.logout');
        if (logout) logout.addEventListener('click', async () => { const userData = getStoredUser(); try { if (userData) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userData.id, role: userData.role }) }); } finally { localStorage.removeItem('contact-sena-user'); localStorage.removeItem('contact-sena-token'); window.location.href = '../../Index.html'; } });
    };

    const initDateFields = () => {
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

    const initDatePickers = () => $$('.input-date-wrapper').forEach(wrapper => wrapper.addEventListener('click', () => {
        const input = $('input[type="date"]', wrapper);
        if (input && typeof input.showPicker === 'function') input.showPicker();
    }));

    const initFormAccessibility = () => {
        const normaliseFields = (fields, formKey) => fields.forEach((field, fieldIndex) => {
            if (!field.id) field.id = `${formKey}-field-${fieldIndex + 1}`;
            if (!field.name) field.name = field.id;
            const parent = field.closest('.form-group, .input-group, .client-form-field, .campaign-form-group, .filter-group, .filter-search-group, .indicator-filter, .indicator-search, .supervisor-date-filter, .supervisor-agent-filter, .supervisor-text-search');
            const label = parent && $('label', parent);
            if (label && !label.contains(field) && !label.htmlFor) label.htmlFor = field.id;
            if (!label && !field.closest('label')) {
                const hiddenLabel = document.createElement('label');
                hiddenLabel.className = 'visually-hidden';
                hiddenLabel.htmlFor = field.id;
                hiddenLabel.textContent = field.getAttribute('aria-label') || field.placeholder || field.name;
                field.parentNode.insertBefore(hiddenLabel, field);
            }
        });
        $$('form').forEach((form, formIndex) => {
            const formKey = (form.id || `form-${formIndex}`).replace(/[^a-zA-Z0-9_-]/g, '-');
            normaliseFields($$('input, select, textarea', form), formKey);
        });
        normaliseFields($$('input, select, textarea').filter(field => !field.form), 'page');
    };

    window.ContactSena = { $, $$, closeVisibleModals };
    document.addEventListener('DOMContentLoaded', () => { enforceModuleRole(); initNavigation(); initModalControls(); initUserModal(); initDateFields(); initDatePickers(); initFormAccessibility(); refreshStoredProfile(); });
})();
