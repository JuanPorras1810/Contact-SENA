(() => {
    'use strict';
    const get = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
    const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const remove = key => localStorage.removeItem(key);
    window.StorageService = { get, save, remove };
})();
