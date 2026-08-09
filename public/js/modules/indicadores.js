document.addEventListener('DOMContentLoaded', () => {
    const rowsBody = document.getElementById('indicator-rows');
    const agent = document.getElementById('indicator-agent');
    const search = document.getElementById('indicator-search-input');
    const result = document.getElementById('indicator-results');
    if (!rowsBody || !agent || !search) return;

    const key = value => String(value || '').trim().split(/\s+/)[0].toLowerCase();
    const date = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '';
    const emptyMetrics = () => ['metric-contacts', 'metric-resolved', 'metric-time', 'metric-tickets'].forEach(id => { const element = document.getElementById(id); if (element) element.textContent = '0'; });
    const render = data => {
        rowsBody.replaceChildren();
        let calls = 0; let resolved = 0; let process = 0; let unmanaged = 0;
        data.forEach(item => {
            calls += Number(item.interactions || 0); resolved += Number(item.resolved || 0); process += Number(item.inProgress || 0); unmanaged += Number(item.unmanaged || 0);
            const row = document.createElement('tr');
            row.dataset.agent = key(item.agent);
            row.dataset.search = `${item.agent} ${item.date} ${item.agentId}`.toLowerCase();
            row.innerHTML = `<td>${date(item.date)}</td><td><div class="indicator-agent-name"><i></i><div><strong>${item.agent || ''}</strong><em>ID: ${item.agentId || ''}</em></div></div></td><td class="indicator-number">${item.interactions || 0}</td><td>0m 00s</td><td><span class="indicator-badge badge-resolved">${item.resolved || 0} Resueltos</span></td><td><span class="indicator-badge badge-process">${item.inProgress || 0} En proceso</span></td><td><span class="indicator-badge badge-unmanaged">${item.unmanaged || 0} Sin gestión</span></td><td>0m 00s</td>`;
            rowsBody.appendChild(row);
        });
        const metrics = { 'metric-contacts': calls, 'metric-resolved': resolved, 'metric-time': '0m 00s', 'metric-tickets': process + unmanaged };
        Object.entries(metrics).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
    };
    const filter = () => { let count = 0; [...rowsBody.querySelectorAll('tr')].forEach(row => { const visible = (agent.value === 'all' || row.dataset.agent === agent.value) && (!search.value.trim() || row.dataset.search.includes(search.value.trim().toLowerCase())); row.hidden = !visible; if (visible) count++; }); if (result) result.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`; };
    const load = async () => {
        rowsBody.replaceChildren();
        emptyMetrics();
        try {
            const response = await fetch('/api/indicadores');
            if (!response.ok) throw new Error('No se pudieron cargar los indicadores');
            const payload = await response.json();
            render(payload.data || []);
            filter();
        } catch (error) { console.error(error); filter(); }
    };
    agent.addEventListener('change', filter); search.addEventListener('input', filter); load();
});
