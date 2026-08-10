document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const role = document.getElementById('radio-supervisor').checked ? 'supervisor' : 'agente';
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: document.getElementById('login-id').value.trim(),
                    password: document.getElementById('login-password').value,
                    role
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'No fue posible iniciar sesión');
            window.location.href = role === 'supervisor' ? 'modulos/supervisor/panelSupervisor.html' : 'modulos/agente/contactos.html';
        } catch (error) {
            alert(error.message);
            if (submit) submit.disabled = false;
        }
    });
});
