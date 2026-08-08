document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-nuevo-contacto'); const button = document.getElementById('btn-nuevo-contacto');
    if (!modal || !button) return;
    const close = () => modal.classList.remove('show'); button.addEventListener('click', () => modal.classList.add('show')); document.getElementById('close-contacto-x')?.addEventListener('click', close); document.getElementById('btn-descartar-contacto')?.addEventListener('click', close); modal.addEventListener('click', event => { if (event.target === modal) close(); });
    const select = document.getElementById('select-cierre-caso'); const evaluate = () => { if (!select) return; select.classList.toggle('select-dinamico-status', Boolean(select.value)); }; select?.addEventListener('change', evaluate); evaluate();
    const ticketBox = document.getElementById('box-ticket-seguimiento'); const updateTicketBox = () => { if (!select || !ticketBox) return; const status = select.options[select.selectedIndex].text.toLowerCase().trim(); ticketBox.classList.toggle('d-none', status !== 'abierto' && status !== 'escalado'); }; select?.addEventListener('change', updateTicketBox); updateTicketBox();
    document.querySelectorAll('.col-estado').forEach(status => { const value = status.textContent.trim().toLowerCase(); status.classList.toggle('estado-pendiente', value === 'abierto' || value === 'escalado'); status.classList.toggle('estado-resuelto', value === 'resuelto'); });
});
