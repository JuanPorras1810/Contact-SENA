document.addEventListener('DOMContentLoaded', () => {
    const rows = [...document.querySelectorAll('#time-rows tr')]; const agent = document.getElementById('time-agent'); const search = document.getElementById('time-search'); const result = document.getElementById('time-results');
    if (!agent || !search) return;
    rows.forEach(row => {
        const person = row.querySelector('.supervisor-person');
        const documentCell = row.cells[2];
        if (!person || !documentCell || person.querySelector('.person-document')) return;
        const documentLabel = document.createElement('small');
        documentLabel.className = 'person-document';
        documentLabel.textContent = `ID: ${documentCell.textContent.trim()}`;
        person.appendChild(documentLabel);
    });
    const filter = () => { let count = 0; rows.forEach(row => { const visible = (agent.value === 'all' || row.dataset.agent === agent.value) && (!search.value.trim() || row.dataset.search.toLowerCase().includes(search.value.trim().toLowerCase())); row.hidden = !visible; if (visible) count++; }); if (result) result.textContent = `${count} ${count === 1 ? 'registro' : 'registros'}`; };
    agent.addEventListener('change', filter); search.addEventListener('input', filter);
});
