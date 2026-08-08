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
            hamburger.addEventListener('click', () => { sidebar.classList.add('show'); overlay.classList.add('show'); });
            overlay.addEventListener('click', () => { sidebar.classList.remove('show'); overlay.classList.remove('show'); });
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

    const initDatePickers = () => $$('.input-date-wrapper').forEach(wrapper => wrapper.addEventListener('click', () => {
        const input = $('input[type="date"]', wrapper);
        if (input && typeof input.showPicker === 'function') input.showPicker();
    }));

    window.ContactSena = { $, $$, closeVisibleModals };
    document.addEventListener('DOMContentLoaded', () => { initNavigation(); initModalControls(); initUserModal(); initDatePickers(); });
})();
