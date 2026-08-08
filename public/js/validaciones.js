(() => {
    'use strict';

    const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const validFileExtension = (file, extensions) => Boolean(file && extensions.some(extension => file.name.toLowerCase().endsWith(extension)));
    const validateDateRange = (start, end) => !start || !end || end >= start;

    window.Validaciones = { validEmail, validFileExtension, validateDateRange };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('form[onsubmit]').forEach(form => form.removeAttribute('onsubmit'));
        document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => {
            if (form.dataset.nativeSubmit !== 'true') event.preventDefault();
        }));
    });
})();
