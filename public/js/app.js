(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const closeVisibleModals = () => {
        $$('.modal-overlay.show, .campaign-modal-overlay:not([hidden]), .client-modal-overlay:not([hidden])').forEach(modal => {
            modal.classList.remove('show');
            modal.hidden = true;
        });
        document.body.classList.remove('modal-open');
    };

    const initNavigation = () => {
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
        const open = () => { modal.classList.add('show'); const popover = $('#user-popover-menu'); if (popover) popover.classList.remove('show'); };
        trigger.addEventListener('click', open);
        trigger.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        $('#close-actualizar')?.addEventListener('click', close);
        $('#btn-cancelar-actualizar')?.addEventListener('click', close);
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        const logout = $('.popover-item.logout');
        if (logout) logout.addEventListener('click', () => { window.location.href = '../../Index.html'; });
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

    window.ContactSena = { $, $$, closeVisibleModals };
    document.addEventListener('DOMContentLoaded', () => { initNavigation(); initModalControls(); initUserModal(); initDateFields(); initDatePickers(); });
})();
