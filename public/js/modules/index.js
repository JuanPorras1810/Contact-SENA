document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', event => { event.preventDefault(); window.location.href = document.getElementById('radio-supervisor').checked ? 'modulos/supervisor/panelSupervisor.html' : 'modulos/agente/contactos.html'; });
});
