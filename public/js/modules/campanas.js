document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.campaigns-grid');
    const count = document.querySelector('.campaign-count');
    const modal = document.getElementById('campaign-modal');
    const form = document.getElementById('campaign-form');
    const open = document.getElementById('open-campaign-modal');
    if (!modal || !form || !open) return;

    const title = document.getElementById('campaign-modal-title');
    const save = form.querySelector('.campaign-save');
    const file = document.getElementById('campaign-file');
    let editingCard = null;
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO') : '';

    const bindCards = () => document.querySelectorAll('.campaign-more').forEach(button => button.addEventListener('click', () => edit(button.closest('.campaign-card'))));
    const loadCampaigns = async () => {
        if (!grid) return;
        try {
            const response = await fetch('/api/campanas');
            if (!response.ok) throw new Error('No se pudieron cargar las campañas');
            const { data } = await response.json();
            grid.replaceChildren();
            data.forEach(campaign => {
                const card = document.createElement('article');
                const start = String(campaign.startDate).slice(0, 10);
                const end = String(campaign.endDate).slice(0, 10);
                const scheduled = new Date(`${start}T00:00:00`) > new Date();
                card.className = 'campaign-card';
                card.dataset.start = start;
                card.dataset.end = end;
                card.innerHTML = `<div class="campaign-card-top"><span class="campaign-status ${scheduled ? 'scheduled-status' : 'active-status'}"><i></i>${scheduled ? 'Programada' : 'Activa'}</span><button class="campaign-more" type="button" aria-label="Configurar campaña">•••</button></div><h4>${escapeHtml(campaign.name)}</h4><div class="campaign-date">${formatDate(start)} <b>→</b> ${formatDate(end)}</div><div class="campaign-card-footer"><span><strong>${campaign.typificationCount || 0}</strong> tipificaciones</span><span class="campaign-pdf">${campaign.fileUrl ? 'PDF' : ''}</span></div>`;
                grid.appendChild(card);
            });
            if (count) count.textContent = `${data.length} campañas`;
            bindCards();
        } catch (error) {
            grid.replaceChildren();
            if (count) count.textContent = '0 campañas';
            console.error(error);
        }
    };

    const close = () => { modal.hidden = true; document.body.classList.remove('modal-open'); open.focus(); };
    const reset = () => { editingCard = null; form.reset(); title.textContent = 'Crear Nueva Campaña Operativa'; save.textContent = '✓ Guardar Campaña'; file.required = true; document.getElementById('file-label').textContent = 'Arrastra y suelta tu archivo PDF aquí'; document.getElementById('created-typifications').hidden = true; };
    const show = () => { reset(); modal.hidden = false; document.body.classList.add('modal-open'); document.getElementById('campaign-name').focus(); };
    const edit = card => { editingCard = card; document.getElementById('campaign-name').value = card.querySelector('h4').textContent; document.getElementById('campaign-start').value = card.dataset.start; document.getElementById('campaign-end').value = card.dataset.end; title.textContent = 'Configurar Campaña Existente'; file.required = false; document.getElementById('created-typifications').hidden = false; modal.hidden = false; document.body.classList.add('modal-open'); };

    open.addEventListener('click', show);
    document.getElementById('close-campaign-modal').addEventListener('click', close);
    document.getElementById('cancel-campaign').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.querySelectorAll('.typification input').forEach(input => input.addEventListener('change', event => event.target.closest('.typification').classList.toggle('selected', event.target.checked)));
    document.getElementById('add-typification').addEventListener('click', () => { const input = document.getElementById('custom-typification-input'); const value = input.value.trim(); if (!value) return; const label = document.createElement('label'); label.className = 'typification selected'; label.innerHTML = `<input type="checkbox" value="${escapeHtml(value)}" checked>✓ ${escapeHtml(value)}`; document.querySelector('.typification-list').appendChild(label); input.value = ''; });
    file.addEventListener('change', event => { if (event.target.files[0]) document.getElementById('file-label').textContent = event.target.files[0].name; });
    form.addEventListener('submit', async event => { event.preventDefault(); const name = document.getElementById('campaign-name').value.trim(); const start = document.getElementById('campaign-start').value; const end = document.getElementById('campaign-end').value; if (!Validaciones.validateDateRange(start, end)) return; if (editingCard) { editingCard.dataset.start = start; editingCard.dataset.end = end; editingCard.querySelector('h4').textContent = name; editingCard.querySelector('.campaign-date').innerHTML = `${formatDate(start)} <b>→</b> ${formatDate(end)}`; close(); return; } try { const formData = new FormData(); formData.append('name', name); formData.append('startDate', start); formData.append('endDate', end); if (file.files[0]) formData.append('file', file.files[0]); const response = await fetch('/api/campanas', { method: 'POST', body: formData }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la campaña'); close(); await loadCampaigns(); } catch (error) { alert(error.message); } });
    loadCampaigns();
});
