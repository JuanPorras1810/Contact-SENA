(() => {
    'use strict';

    const correoValido = valor => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    const extensionArchivoValida = (archivo, extensiones) => Boolean(archivo && extensiones.some(extension => archivo.name.toLowerCase().endsWith(extension)));
    const rangoFechasValido = (inicio, fin) => !inicio || !fin || fin >= inicio;
    const reglas = {
        'login-id': { maximo: 11, patron: /^\d+$/, mensajePatron: 'Solo se permiten números.' },
        'agente-documento': { maximo: 11, patron: /^\d+$/, mensajePatron: 'La identificación solo debe contener números.' },
        'cliente-documento': { maximo: 11, patron: /^\d+$/, mensajePatron: 'El documento solo debe contener números.' },
        'agente-telefono': { maximo: 10, patron: /^\d+$/, mensajePatron: 'El teléfono solo debe contener números.' },
        'agente-telefono-alt': { maximo: 10, patron: /^\d+$/, mensajePatron: 'El teléfono solo debe contener números.' },
        'cliente-telefono': { maximo: 10, patron: /^\d+$/, mensajePatron: 'El teléfono solo debe contener números.' },
        'cliente-telefono-alt': { maximo: 10, patron: /^\d+$/, mensajePatron: 'El teléfono solo debe contener números.' },
        'agente-nombre': { maximo: 60 },
        'agente-correo': { maximo: 100 },
        'agente-direccion': { maximo: 60 },
        'agente-contrasena': { maximo: 60 },
        'cliente-nombre': { maximo: 60 },
        'cliente-correo': { maximo: 100 },
        'cliente-direccion': { maximo: 60 },
        'cliente-observaciones': { maximo: 300 },
        'contact-reason': { maximo: 500 },
        'contact-observation': { maximo: 300 },
        'contact-case-comment': { maximo: 500 },
        'campaign-name': { maximo: 500 },
        'custom-typification-input': { maximo: 100 }
    };
    const nombres = new Set(['agente-nombre', 'cliente-nombre']);
    const obtenerRegla = campo => reglas[campo.id] || {};
    const obtenerContenedorMensaje = campo => campo.closest('.input-group, .client-form-field, .campaign-form-group, .form-group, .filter-group, .indicator-filter, .supervisor-date-filter, .supervisor-agent-filter, .supervisor-text-search') || campo.parentElement;
    const mostrarError = (campo, mensaje) => {
        campo.classList.add('campo-invalido');
        campo.setAttribute('aria-invalid', 'true');
        const contenedor = obtenerContenedorMensaje(campo);
        let mensajeElemento = contenedor?.querySelector('.mensaje-validacion');
        if (!mensajeElemento) { mensajeElemento = document.createElement('small'); mensajeElemento.className = 'mensaje-validacion'; contenedor?.appendChild(mensajeElemento); }
        mensajeElemento.textContent = mensaje;
    };
    const limpiarError = campo => {
        campo.classList.remove('campo-invalido');
        campo.removeAttribute('aria-invalid');
        const contenedor = obtenerContenedorMensaje(campo);
        contenedor?.querySelector('.mensaje-validacion')?.remove();
    };
    const validarCampo = campo => {
        if (!campo || campo.disabled || campo.readOnly) return true;
        limpiarError(campo);
        const valor = campo.value.trim();
        const regla = obtenerRegla(campo);
        if (campo.required && (!valor || (campo.tagName === 'SELECT' && (!campo.value || campo.value === 'Seleccione...')))) { mostrarError(campo, 'Este campo es obligatorio.'); return false; }
        if (!valor) return true;
        if (campo.type === 'email' && !correoValido(valor)) { mostrarError(campo, 'Escribe un correo electrónico válido.'); return false; }
        const maximo = regla.maximo || (campo.maxLength > 0 ? campo.maxLength : null);
        if (maximo && valor.length > maximo) { mostrarError(campo, `Máximo ${maximo} caracteres.`); return false; }
        if (regla.patron && !regla.patron.test(valor)) { mostrarError(campo, regla.mensajePatron || 'El formato no es válido.'); return false; }
        if (campo.type === 'tel' && !/^\d{7,15}$/.test(valor)) { mostrarError(campo, 'Ingresa un teléfono válido de 7 a 15 números.'); return false; }
        if (nombres.has(campo.id) && !/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.'-]+$/.test(valor)) { mostrarError(campo, 'Este campo solo permite letras y espacios.'); return false; }
        if (campo.type === 'date' && Number.isNaN(new Date(`${valor}T00:00:00`).getTime())) { mostrarError(campo, 'Selecciona una fecha válida.'); return false; }
        return true;
    };
    const validarFormulario = formulario => {
        let valido = true; let primerError = null;
        formulario.querySelectorAll('input, select, textarea').forEach(campo => { if (!validarCampo(campo)) { valido = false; primerError ||= campo; } });
        const fechas = [...formulario.querySelectorAll('input[type="date"]')];
        if (fechas.length >= 2 && !rangoFechasValido(fechas[0].value, fechas[1].value)) { mostrarError(fechas[1], 'La fecha final no puede ser anterior a la fecha inicial.'); valido = false; primerError ||= fechas[1]; }
        if (!valido) primerError?.focus();
        return valido;
    };

    window.Validaciones = { correoValido, extensionArchivoValida, rangoFechasValido, validarCampo, validarFormulario };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('form').forEach(formulario => formulario.addEventListener('submit', evento => {
            if (!validarFormulario(formulario)) { evento.preventDefault(); evento.stopImmediatePropagation(); }
        }, true));
        document.querySelectorAll('form').forEach(formulario => { formulario.noValidate = true; });
        document.addEventListener('input', evento => { if (evento.target.matches('input, select, textarea')) validarCampo(evento.target); });
        document.addEventListener('change', evento => { if (evento.target.matches('input, select, textarea')) validarCampo(evento.target); });
    });
})();
