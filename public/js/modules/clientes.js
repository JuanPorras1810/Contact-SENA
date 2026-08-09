document.addEventListener('DOMContentLoaded', () => {
    const rows = document.getElementById('clients-rows');
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const loadClients = async () => {
        if (!rows) return;
        try {
            const response = await fetch('/api/clientes');
            if (!response.ok) throw new Error('No se pudieron cargar los clientes');
            const { data } = await response.json();
            rows.replaceChildren();
            data.forEach(client => {
                const row = document.createElement('tr');
                row.innerHTML = `<td><span class="col-campana">${escapeHtml(client.campaign)}</span></td><td>${escapeHtml(client.phone)}<div class="phone-subtext">${client.phoneAlt ? `OPCIONAL: ${escapeHtml(client.phoneAlt)}` : ''}</div></td><td><strong>${escapeHtml(client.name)}</strong></td><td>${escapeHtml(client.email)}</td><td>${escapeHtml(client.address)}<div class="dir-subtext"></div></td><td><button class="btn-edit-action" type="button" aria-label="Editar cliente"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button></td>`;
                rows.appendChild(row);
            });
        } catch (error) {
            rows.replaceChildren();
            console.error(error);
        }
    };
    loadClients();
    const newModal = document.getElementById('modal-nuevo-cliente'); const csvModal = document.getElementById('modal-carga-csv'); const newButton = document.getElementById('btn-nuevo-cliente'); const csvButton = document.getElementById('btn-carga-csv');
    if (!newModal || !csvModal || !newButton || !csvButton) return;
    const close = () => { newModal.hidden = true; csvModal.hidden = true; document.body.classList.remove('modal-open'); }; const open = modal => { modal.hidden = false; document.body.classList.add('modal-open'); };
    newButton.addEventListener('click', () => { open(newModal); document.getElementById('cliente-documento')?.focus(); }); csvButton.addEventListener('click', () => open(csvModal)); document.querySelectorAll('[data-close-client-modal]').forEach(button => button.addEventListener('click', close)); document.querySelectorAll('.client-modal-overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) close(); }));
    document.getElementById('nuevo-cliente-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const selectValue = id => document.getElementById(id).selectedIndex + 1; const body = { documentTypeId: selectValue('cliente-tipo-documento'), campaignId: selectValue('cliente-campana'), neighborhoodId: selectValue('cliente-barrio'), documentId: document.getElementById('cliente-documento').value.trim(), name: document.getElementById('cliente-nombre').value.trim(), email: document.getElementById('cliente-correo').value.trim(), phone: document.getElementById('cliente-telefono').value.trim(), phoneAlt: document.getElementById('cliente-telefono-alt').value.trim(), address: document.getElementById('cliente-direccion').value.trim(), observation: document.getElementById('cliente-observaciones').value.trim() }; try { const response = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el cliente'); form.reset(); await loadClients(); close(); } catch (error) { alert(error.message); } }); const input = document.getElementById('csv-file'); const process = document.getElementById('process-csv'); input?.addEventListener('change', () => { const valid = Validaciones.validFileExtension(input.files[0], ['.csv']); process.disabled = !valid; process.classList.toggle('ready', valid); }); process?.addEventListener('click', () => { if (!process.disabled) close(); });
    document.getElementById('download-csv-template')?.addEventListener('click', event => { event.preventDefault(); const content = 'campaña,tipo_documento,numero_documento,nombre_completo,correo,telefono\nRetención de Clientes 2026,Cédula de Ciudadanía,1098765432,Cliente de ejemplo,correo@ejemplo.com,3001112233'; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); link.download = 'plantilla_clientes.csv'; link.click(); URL.revokeObjectURL(link.href); });
});
