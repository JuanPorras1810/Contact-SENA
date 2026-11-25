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

    const recoveryModal = document.getElementById('recovery-modal');
    const documentStep = document.getElementById('recovery-document-form');
    const codeStep = document.getElementById('recovery-code-form');
    const passwordStep = document.getElementById('recovery-password-form');
    const feedback = document.getElementById('recovery-feedback');
    const closeRecovery = () => { if (recoveryModal) recoveryModal.hidden = true; };
    document.getElementById('open-recovery')?.addEventListener('click', () => {
        recoveryModal.hidden = false;
        documentStep.hidden = false;
        codeStep.hidden = true;
        passwordStep.hidden = true;
        feedback.textContent = '';
        document.getElementById('recovery-document').focus();
    });
    document.getElementById('close-recovery')?.addEventListener('click', closeRecovery);
    recoveryModal?.addEventListener('click', event => { if (event.target === recoveryModal) closeRecovery(); });
    documentStep?.addEventListener('submit', event => {
        event.preventDefault();
        documentStep.hidden = true;
        codeStep.hidden = false;
        feedback.textContent = 'Vista previa: el código único sería enviado al correo registrado.';
        document.getElementById('recovery-code').focus();
    });
    codeStep?.addEventListener('submit', event => {
        event.preventDefault();
        const code = document.getElementById('recovery-code').value.trim();
        if (!/^\d{6}$/.test(code)) {
            feedback.textContent = 'Ingresa un código único de 6 dígitos.';
            return;
        }
        codeStep.hidden = true;
        passwordStep.hidden = false;
        feedback.textContent = 'Código validado en la vista de demostración.';
        document.getElementById('recovery-new-password').focus();
    });
    passwordStep?.addEventListener('submit', event => {
        event.preventDefault();
        const password = document.getElementById('recovery-new-password').value;
        const confirmation = document.getElementById('recovery-confirm-password').value;
        if (password !== confirmation) {
            feedback.textContent = 'Las contraseñas no coinciden.';
            return;
        }
        feedback.textContent = 'Vista completada. El cambio real de contraseña requiere conectar el backend.';
    });
});
