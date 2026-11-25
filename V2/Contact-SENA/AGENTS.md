# Agent guidance

## Run and verify

- This is a Node.js 18+ CommonJS application. Install with `npm install`; there are no workspace packages.
- Create `.env` from `.env.example`, configure the MySQL connection, and set `JWT_SECRET`. Initialize a fresh database with `mysql -u root -p < database/contactSena.sql` before running the server.
- `npm start` runs `node server.js`; `npm run dev` runs the Node watch mode. Both require a reachable MySQL database because startup checks the connection and runs `ensureOperationalSchema()`.
- There are no configured tests, lint scripts, or type checks. For a syntax-only check of all JavaScript, run in PowerShell: `Get-ChildItem -Path . -Recurse -File -Filter *.js | ForEach-Object { node --check $_.FullName }`.

## Structure and implementation

- `server.js` is the entrypoint: it serves `public/`, applies CSRF/origin checks, and mounts the APIs under `/api`. Keep new endpoints in the route → controller → model pattern under `src/routes`, `src/controllers`, and `src/models`.
- Frontend role pages live in `public/modulos/agente` and `public/modulos/supervisor`; shared browser code is in `public/js`, with module-specific behavior in `public/js/modules`.
- Authentication is JWT in the `contact_sena_session` HttpOnly cookie (Bearer tokens are also accepted). API routes must use `autenticar` and the appropriate `requerirRol`; state-changing API requests also pass the global origin/CSRF middleware.
- Database schema and seed users are in `database/contactSena.sql`. Database access uses the shared promise pool in `src/config/database.js`; do not assume schema changes are migrations—the server currently applies a small set of operational `ALTER TABLE` fixes at startup.
- File upload field names and limits are part of the API: campaign PDFs use multipart field `file` and are written to `public/uploads/campaigns` (10 MB max); client CSV imports use `file` in memory (5 MB max).
- The frontend expects cookie credentials for API calls and role URLs are enforced client-side as well as server-side. Preserve the API response shapes (`{ data: ... }`, `{ user: ... }`, or `{ error: ... }`) used by the existing modules.

## Contexto funcional de Contact SENA

Contact SENA es una aplicación web de contact center para gestionar campañas,
clientes, llamadas, casos y asistencia de agentes. La interfaz actual está
hecha con HTML, CSS y JavaScript vanilla; el backend es Node.js/Express y
persiste la información en MySQL. No migrar a React o TypeScript todavía.

### Roles y acceso

- **Agente:** trabaja los clientes que le fueron asignados, realiza llamadas
  simuladas, registra la gestión, consulta su tiempo y revisa su historial.
- **Supervisor:** administra asesores, clientes y campañas; consulta el panel,
  indicadores, tiempos de agentes, su propio tiempo e historial de gestiones.
- La autenticación usa JWT en la cookie HttpOnly `contact_sena_session`.
  También se aceptan tokens Bearer. Las rutas deben validar autenticación y
  rol en el servidor, además de la protección global de origen/CSRF para
  operaciones que modifican datos.

### Módulos del agente

Las páginas están en `public/modulos/agente`:

- `contactos.html` — gestión de contactos y llamadas del día.
- `tiempoAgente.html` — registro del tiempo y asistencia del agente.
- `historialAgente.html` — historial de gestiones realizadas.

En **Contactos**, el agente ve cliente, campaña, tipificación, observaciones,
tiempo y estado. Los canales de contacto fueron retirados de la interfaz: las
interacciones actuales se registran como llamadas.

Flujo para registrar una gestión:

1. Se selecciona un cliente asignado y se abre “Nuevo Contacto”.
2. Se muestran documento, nombre, teléfonos, correo, dirección y observación
   del cliente, además del motivo y el protocolo PDF de la campaña si existe.
3. El agente debe pulsar **Hacer llamada** para iniciar el simulador.
4. La llamada debe finalizarse explícitamente antes de guardar. Se muestran
   inicio, cierre y duración en formato `HH:MM:SS`; no se debe permitir guardar
   una llamada que no haya iniciado y terminado.
5. Se seleccionan tipificación, resultado de la gestión y se escriben
   observaciones. El botón para abrir el PDF queda centrado debajo de las
   observaciones.
6. El resultado vacío `Seleccione...` no es una gestión válida y nunca debe
   crear un caso.
7. Solo los resultados **En proceso** y **Sin gestión** crean un `caso`.
   **Efectivo** registra la interacción efectiva, pero no crea un caso.

Las tipificaciones base de campaña son:

- `Volver a llamar`
- `Contacto efectivo`
- `Buzón de mensajes`
- `Número equivocado`

Las asignaciones permiten seleccionar o informar el documento del agente y la
campaña (nombre o código), según los controles disponibles en el módulo.
En el modal de asignación se usa autocompletado, no cuatro controles separados:
una caja busca agentes por documento o nombre y muestra sugerencias con el
formato `documento - nombre`; otra caja busca campañas por código o nombre.
La selección guarda los identificadores ocultos requeridos por la API.

### Estados y casos

- **Efectivo:** la gestión fue exitosa; no crea caso.
- **En proceso:** requiere seguimiento; crea caso.
- **Sin gestión:** no se completó la gestión; crea caso.

No reintroducir los estados anteriores ni crear casos cuando el resultado sea
`Seleccione...`. La creación de interacción y caso debe conservar el flujo
atómico implementado en `src/models/interactionModel.js`.

### Pausas y sesiones

Las pausas no cierran la sesión activa. La duración acumulada está en
`registroAgente.tiempoPausaRegAge` y
`registroSupervisor.tiempoPausaRegSup`; no existe columna `inicioPausa`.
`ensureOperationalSchema()` migra las columnas antiguas al iniciar el servidor.
El instante de una pausa activa se conserva en el navegador y en memoria del
servidor, y se acumula al reanudar o cerrar la sesión.

- El usuario inicia y reanuda la pausa desde el menú de sesión.
- Mientras está pausado aparece un overlay bloqueante con contador.
- La pausa debe acumular su duración sin perder la sesión ni exigir nuevo
  inicio de sesión.
- Al cerrar o consultar la asistencia, el tiempo de pausa debe reflejarse en
  los cálculos y tablas.
- La lógica de sesión y pausas está en `src/models/sessionModel.js`,
  `src/config/database.js` y los módulos de tiempos.

### Módulos del supervisor

Las páginas están en `public/modulos/supervisor`:

- `panelSupervisor.html` — resumen operativo y actividades recientes.
- `asesores.html` — gestión de agentes/asesores.
- `clientes.html` — consulta y administración de clientes, incluida la carga
  CSV cuando corresponda.
- `campañas.html` — campañas, tipificaciones y protocolo PDF.
- `indicadores.html` — rendimiento agregado por agente.
- `tiempoSupervisor.html` — asistencia y tiempos.
- `historialSupervisor.html` — historial general de gestiones.

El panel de actividades debe mostrar, cuando estén disponibles, código de
gestión, agente, cliente, campaña y tipificación.

### Registro de tiempos

`public/js/modules/tiempos.js` controla las vistas de tiempo y
`src/routes/timeRoutes.js` expone:

- `GET /api/tiempos/supervisor` — vista global del supervisor, protegida para
  rol supervisor.
- `GET /api/tiempos/propio` — “Mi tiempo” del supervisor, protegida para
  rol supervisor.
- `GET /api/tiempos/agente` — tiempo propio del agente, protegida para rol
  agente.

En `tiempoSupervisor.html` existen dos pestañas separadas:

- **Tiempo de agentes:** muestra registros globales y conserva el filtro
  **Buscar por Agente**.
- **Mi tiempo:** muestra únicamente la asistencia del supervisor actual,
  identifica al usuario como `Supervisor`, oculta **Buscar por Agente** y
  muestra **Tiempo de pausas**.

La tabla de tiempos incluye fecha, agente, documento, inicio, cierre, tiempo
total y tiempo de pausas. Deben conservarse los filtros de fechas y búsqueda
libre, y no mezclar la consulta global con la consulta propia.
El filtro de agente de indicadores y el filtro de **Tiempo de agentes** del
supervisor deben ser cajas de autocompletado: buscar por documento o nombre
mientras se escribe y mostrar sugerencias con el formato `documento - nombre`.
**Mi tiempo** del supervisor y el tiempo propio del agente solo filtran por
fecha. El historial de gestiones filtra por categoría y ofrece sugerencias.

En **Asignación de Campañas**, el buscador permite elegir Agente o Campaña y
muestra sugerencias `documento - nombre` o `código - nombre`; seleccionar una
filtra por el documento o código exacto. En **Clientes**, el buscador permite
elegir Cliente o Campaña y
ofrece sugerencias únicas; al elegir una filtra por ID/código exacto. Texto
filtra por nombre y números por el ID del cliente o código de campaña, según el
criterio elegido. No debe
buscar por documento personal, teléfono o correo. El botón `Nuevo Cliente`
queda al final de la barra de
filtros. En **Campañas**,
el buscador con sugerencias por código o nombre y el botón `Nueva Campaña`
están dentro de la misma barra blanca.

`historialSupervisor.html` y `historialAgente.html` comparten el autocompletado
por categoría. Supervisor: `Agente`, `Cliente`, `Código`. Agente: `Código`
primero, luego `Cliente`, también en Tickets; el servidor limita sus datos al
usuario autenticado. Las sugerencias filtran la tabla activa y seleccionarlas
aplica coincidencia exacta de ID/código. Tickets incluyen cliente desde la
interacción asociada. Mantener el mismo estilo tipográfico de sugerencias en
tiempos, historial, clientes y asignaciones.

En el directorio de asesores se busca por documento o nombre. Asignación de
Campañas permite elegir Agente o Campaña y sugiere `documento - nombre` o
`código - nombre`, aplicando filtro exacto al seleccionar.

### Indicadores

`indicadores.html` y `public/js/modules/indicadores.js` muestran filtros por
fechas, agente y búsqueda, además de métricas resumidas. La tabla principal
debe conservar estas columnas:

- Fecha
- Agente
- Llamadas realizadas
- Adherencia al turno
- Tiempo de conexión
- TMO
- Acciones

La ruta `GET /api/indicadores` es exclusiva del supervisor. La acción de
detalle abre un modal con fecha, documento y nombre del agente, totales
coloreados, tarjetas de adherencia, conexión y TMO, y finalmente el resumen
de tipificaciones con columnas para `Efectivos`, `En proceso` y `Sin gestión`.

### API y organización

Las rutas principales están organizadas así:

- `src/routes/authRoutes.js` — inicio y cierre de sesión.
- `src/routes/interactionRoutes.js` — catálogos, gestiones del día y creación
  de interacciones.
- `src/routes/timeRoutes.js` — tiempos y asistencia.
- `src/routes/indicatorRoutes.js` — indicadores.
- `src/routes/panelRoutes.js` — panel y actividades.
- `src/routes/historyRoutes.js` — historiales.
- `src/routes/clientRoutes.js` — clientes e importación.
- `src/routes/campaignRoutes.js` — campañas y PDF.
- `src/routes/advisorRoutes.js` — asesores.
- `src/routes/catalogRoutes.js` — catálogos.

Mantener siempre el patrón ruta → controlador → modelo. Los módulos del
frontend esperan respuestas con las formas existentes `{ data: ... }`,
`{ user: ... }` o `{ error: ... }`; no cambiar estas formas sin actualizar
todos los consumidores.

### Base de datos, archivos y configuración

- El esquema inicial y usuarios semilla están en
  `database/contactSena.sql`.
- El pool compartido está en `src/config/database.js`; al iniciar el servidor
  se ejecuta `ensureOperationalSchema()` para ajustes de compatibilidad.
- Los PDF de campañas se reciben en el campo multipart `file`, con máximo
  10 MB, y se guardan en `public/uploads/campaigns`.
- Los CSV de clientes usan el campo `file`, se procesan en memoria y tienen
  máximo 5 MB.
- `database/datosPrueba20.sql` contiene 20 agentes, clientes, asignaciones y
  registros de sesión adicionales para probar búsquedas y tablas sin borrar los
  datos base. También genera 20 interacciones demo del día actual y 10 llamadas
  adicionales para indicadores, con tipificaciones variadas y casos para los
  estados `En proceso` y `Sin gestión`. Las fechas de estas gestiones usan
  `CURDATE()`. Se ejecuta después de `database/contactSena.sql`.
- Nunca guardar contraseñas, JWT secrets ni credenciales de MySQL en
  `AGENTS.md`, Git o archivos públicos.
- La recuperación de contraseña en la pantalla de login es actualmente solo
  una vista: solicita documento, muestra la etapa de código único y luego la
  nueva contraseña, pero no envía correos, no valida códigos contra el backend
  ni cambia la contraseña en la base de datos.

### Criterios para cambios futuros

- Revisar primero el HTML, módulo JavaScript, controlador, modelo y ruta
  relacionados antes de cambiar una funcionalidad.
- Mantener nombres de campos, identificadores DOM, estados, roles y formas de
  respuesta compatibles con el frontend existente.
- Si se cambia una columna de tabla, actualizar simultáneamente encabezado,
  renderizado del cuerpo, filtros y estilos para evitar desalineaciones.
- Después de cambios JavaScript, ejecutar la comprobación de sintaxis indicada
  arriba y verificar manualmente las vistas afectadas con una recarga fuerte
  del navegador (`Ctrl+F5`) si hay assets cacheados.
