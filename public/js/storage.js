(() => {
    'use strict';
    const obtener = (clave, valorAlternativo = []) => { try { return JSON.parse(sessionStorage.getItem(clave)) ?? valorAlternativo; } catch { return valorAlternativo; } };
    const guardar = (clave, valor) => sessionStorage.setItem(clave, JSON.stringify(valor));
    const eliminar = clave => sessionStorage.removeItem(clave);
    for (let indice = sessionStorage.length - 1; indice >= 0; indice -= 1) { const clave = sessionStorage.key(indice); if (clave?.startsWith('contact-sena:clave-borradores') || clave?.startsWith('contact-sena:borrador:') || clave?.startsWith('contact-sena-draft')) sessionStorage.removeItem(clave); }
    window.StorageService = { get: obtener, save: guardar, remove: eliminar };
})();
