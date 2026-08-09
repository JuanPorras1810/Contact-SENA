document.addEventListener('DOMContentLoaded', () => {
    const directoryRows = document.getElementById('advisors-rows');
    const assignmentRows = document.getElementById('assignments-rows');
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const loadAdvisors = async () => {
        try {
            const response = await fetch('/api/asesores');
            if (!response.ok) throw new Error('No se pudieron cargar los agentes');
            const { data } = await response.json();
            const campaignResponse = await fetch('/api/campanas');
            const campaignPayload = campaignResponse.ok ? await campaignResponse.json() : { data: [] };
            const agentSelect = document.getElementById('asignacion-agente');
            const campaignSelect = document.getElementById('asignacion-campana');
            if (agentSelect) { agentSelect.replaceChildren(...data.map(advisor => new Option(advisor.name, advisor.id))); }
            if (campaignSelect) { campaignSelect.replaceChildren(...(campaignPayload.data || []).map(campaign => new Option(campaign.name, campaign.id))); }
            if (directoryRows) {
                directoryRows.replaceChildren();
                data.forEach(advisor => { const row = document.createElement('tr'); row.innerHTML = `<td><strong>Cédula de Ciudadanía</strong></td><td><strong class="col-codigo">${escapeHtml(advisor.id)}</strong></td><td><div><span class="col-canal">${escapeHtml(advisor.name)}</span></div></td><td>${escapeHtml(advisor.email)}</td><td>${escapeHtml(advisor.phone)}</td><td>${escapeHtml(advisor.address)}</td><td><button class="btn-edit-action" type="button" aria-label="Editar agente"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button></td>`; directoryRows.appendChild(row); });
            }
            if (assignmentRows) {
                assignmentRows.replaceChildren();
                data.filter(advisor => advisor.campaign).forEach((advisor, index) => { const row = document.createElement('tr'); row.innerHTML = `<td>${index + 1}</td><td><span class="col-canal">${escapeHtml(advisor.name)}</span></td><td><span class="col-campana">${escapeHtml(advisor.campaign)}</span></td><td><button class="btn-edit-action" type="button" aria-label="Editar asignación"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0-1.83 1.83 3.75 3.75 3.75 3.75l1.83-1.83z"/></svg></button></td>`; assignmentRows.appendChild(row); });
            }
        } catch (error) { directoryRows?.replaceChildren(); assignmentRows?.replaceChildren(); console.error(error); }
    };
    loadAdvisors();
    const advisorModal = document.getElementById('modal-nuevo-agente'); const assignmentModal = document.getElementById('modal-asignar-campana'); const openAdvisor = document.getElementById('btn-nuevo-agente'); const openAssignment = document.getElementById('btn-asignar-campana');
    if (!advisorModal || !assignmentModal || !openAdvisor || !openAssignment) return;
    const close = () => { advisorModal.hidden = true; assignmentModal.hidden = true; document.body.classList.remove('modal-open'); }; const open = modal => { modal.hidden = false; document.body.classList.add('modal-open'); };
    openAdvisor.addEventListener('click', () => { open(advisorModal); document.getElementById('agente-documento')?.focus(); }); openAssignment.addEventListener('click', () => open(assignmentModal)); document.querySelectorAll('[data-close-advisor-modal]').forEach(button => button.addEventListener('click', close)); document.querySelectorAll('#modal-nuevo-agente, #modal-asignar-campana').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) close(); })); document.getElementById('nuevo-agente-form')?.addEventListener('submit', async event => { event.preventDefault(); const selectValue = id => document.getElementById(id).selectedIndex + 1; const body = { id: document.getElementById('agente-documento').value.trim(), documentTypeId: selectValue('agente-tipo-documento'), neighborhoodId: selectValue('agente-barrio'), name: document.getElementById('agente-nombre').value.trim(), email: document.getElementById('agente-correo').value.trim(), password: document.getElementById('agente-contrasena').value, phone: document.getElementById('agente-telefono').value.trim(), phoneAlt: document.getElementById('agente-telefono-alt').value.trim(), address: document.getElementById('agente-direccion').value.trim(), photo: document.getElementById('agente-avatar').value.trim() }; try { const response = await fetch('/api/asesores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'No se pudo registrar el agente'); await loadAdvisors(); close(); event.currentTarget.reset(); } catch (error) { alert(error.message); } }); document.getElementById('asignar-campana-form')?.addEventListener('submit', async event => { event.preventDefault(); const body = { agentId: document.getElementById('asignacion-agente').value, campaignId: Number(document.getElementById('asignacion-campana').value) }; try { const response = await fetch('/api/panel/asignaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la asignación'); await loadAdvisors(); close(); event.currentTarget.reset(); } catch (error) { alert(error.message); } });
});
