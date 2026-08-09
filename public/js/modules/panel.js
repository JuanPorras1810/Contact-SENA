document.addEventListener('DOMContentLoaded', () => {
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const loadPanel = async () => {
        try {
            const response = await fetch('/api/panel');
            if (!response.ok) throw new Error('No se pudo cargar el panel');
            const data = await response.json();
            const connected = document.getElementById('connected-rows'); const cases = document.getElementById('cases-rows'); const activities = document.getElementById('activities-rows');
            connected?.replaceChildren(); cases?.replaceChildren(); activities?.replaceChildren();
            (data.connected || []).forEach(item => { const row = document.createElement('tr'); row.innerHTML = `<td><strong class="col-cliente">${escapeHtml(item.id)}</strong></td><td><span class="col-canal">${escapeHtml(item.name)}</span></td><td><span class="open-badge">En Línea</span></td>`; connected?.appendChild(row); });
            (data.cases || []).forEach(item => { const row = document.createElement('tr'); row.innerHTML = `<td><strong class="cod-blue">TK-${item.id}</strong></td><td>${formatDate(item.createdAt)}</td><td><span class="col-canal">${escapeHtml(item.agent)}</span></td><td>${escapeHtml(item.comment)}</td>`; cases?.appendChild(row); });
            (data.activities || []).forEach(item => { const row = document.createElement('tr'); row.innerHTML = `<td><strong class="cod-blue">#${item.id}</strong></td><td><span class="col-canal">${escapeHtml(item.agent)}</span></td><td>${escapeHtml(item.client)}</td><td><span class="col-campana">${escapeHtml(item.reason)}</span></td><td>${escapeHtml(item.observation)}</td>`; activities?.appendChild(row); });
        } catch (error) { document.getElementById('connected-rows')?.replaceChildren(); document.getElementById('cases-rows')?.replaceChildren(); document.getElementById('activities-rows')?.replaceChildren(); console.error(error); }
    };
    loadPanel();
    const colors = { 'card-agentes': 'highlight-blue', 'card-casos': 'highlight-amber', 'card-actividades': 'highlight-purple' }; const sections = ['seccion-tabla-agentes', 'seccion-tabla-casos', 'seccion-tabla-actividades', 'seccion-tabla-bitacora'];
    const showSection = id => sections.forEach(sectionId => { const section = document.getElementById(sectionId); if (section) { section.classList.toggle('active-section', sectionId === id); section.style.display = sectionId === id ? 'block' : 'none'; } });
    Object.keys(colors).forEach(id => document.getElementById(id)?.addEventListener('click', event => { Object.keys(colors).forEach(cardId => document.getElementById(cardId)?.classList.remove('highlight-blue', 'highlight-amber', 'highlight-purple', 'active-card-init')); const card = event.currentTarget; card.classList.add(colors[id]); if (card.dataset.target) showSection(card.dataset.target); }));
    const initial = document.querySelector('.active-card-init') || document.getElementById('card-casos'); if (initial) { initial.classList.add(colors[initial.id]); showSection(initial.dataset.target); }
});
