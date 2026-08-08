document.addEventListener('DOMContentLoaded', () => {
    const rows = [...document.querySelectorAll('#indicator-rows tr')]; const agent = document.getElementById('indicator-agent'); const search = document.getElementById('indicator-search-input'); const result = document.getElementById('indicator-results');
    if (!agent || !search) return;
    const filter = () => { let count = 0; rows.forEach(row => { const visible = (agent.value === 'all' || row.dataset.agent === agent.value) && (!search.value.trim() || row.dataset.search.toLowerCase().includes(search.value.trim().toLowerCase())); row.hidden = !visible; if (visible) count++; }); if (result) result.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`; };
    agent.addEventListener('change', filter); search.addEventListener('input', filter);
});
