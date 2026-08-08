document.addEventListener('DOMContentLoaded', () => {
    const colors = { 'card-agentes': 'highlight-blue', 'card-casos': 'highlight-amber', 'card-actividades': 'highlight-purple' }; const sections = ['seccion-tabla-agentes', 'seccion-tabla-casos', 'seccion-tabla-actividades', 'seccion-tabla-bitacora'];
    const showSection = id => sections.forEach(sectionId => { const section = document.getElementById(sectionId); if (section) { section.classList.toggle('active-section', sectionId === id); section.style.display = sectionId === id ? 'block' : 'none'; } });
    Object.keys(colors).forEach(id => document.getElementById(id)?.addEventListener('click', event => { Object.keys(colors).forEach(cardId => document.getElementById(cardId)?.classList.remove('highlight-blue', 'highlight-amber', 'highlight-purple', 'active-card-init')); const card = event.currentTarget; card.classList.add(colors[id]); if (card.dataset.target) showSection(card.dataset.target); }));
    const initial = document.querySelector('.active-card-init') || document.getElementById('card-casos'); if (initial) { initial.classList.add(colors[initial.id]); showSection(initial.dataset.target); }
});
