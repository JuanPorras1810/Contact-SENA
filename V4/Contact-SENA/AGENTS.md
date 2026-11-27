# Contact SENA agent notes

## Setup and verification

- This is a Node.js 18+ CommonJS app; there are no workspaces or test/lint/typecheck scripts.
- Install with `npm install`. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell), then configure MySQL and `JWT_SECRET`.
- Initialize a fresh database with `mysql -u root -p < database/contactSena.sql`. `database/datos.sql` is optional test data and should be applied after the base schema.
- `npm start` runs `node server.js`; `npm run dev` runs `node --watch server.js`. Both require a reachable MySQL database because startup checks the connection and applies `ensureOperationalSchema()`.
- The server listens on port `3000` unless `PORT` is set. `GET /api/health` checks database connectivity.
- For JavaScript-only verification in PowerShell:
  `Get-ChildItem -Path . -Recurse -File -Filter *.js | ForEach-Object { node --check $_.FullName }`

## Architecture

- `server.js` serves `public/`, applies global origin/CSRF checks, and mounts `/api` routes. Keep backend changes in the route → controller → model layers under `src/routes`, `src/controllers`, and `src/models`.
- The frontend is vanilla HTML/CSS/JavaScript. Role pages are under `public/modulos/agente` and `public/modulos/supervisor`; shared browser code is under `public/js`, with feature modules under `public/js/modules`.
- Database access uses the shared promise pool in `src/config/database.js`. Schema compatibility changes are currently startup `ALTER TABLE` operations, not a migration system.
- Preserve existing API response shapes (`{ data: ... }`, `{ user: ... }`, `{ error: ... }`) and existing DOM IDs/field names when changing frontend or backend code together.
- The application has two operational roles: `supervisor` and `agente`. Shared authentication/session code is in `public/js/app.js` and `public/js/storage.js`; role-specific authorization is enforced by backend middleware.
- Main supervisor pages/modules include the dashboard, advisors, contacts, typifications, campaigns, indicators, time records, and interaction history. Agent modules include assigned contacts/call management, time records, and personal history.
- Feature pages commonly load a matching module from `public/js/modules/`. Keep DOM IDs stable unless both the HTML and every JavaScript consumer are updated.
- The frontend has no bundler or component framework: HTML pages load scripts with `<script defer>`, and browser modules initialize from `DOMContentLoaded`. Shared visual styles are centralized in `public/css/style.css`; cache-busting query strings may be used on changed page assets.
- `src/middleware/` contains authentication, CSRF/origin protection, rate limiting, and upload validation; `src/utils/http.js` contains async/error response helpers. Prefer these existing helpers over adding a parallel pattern.
- `database/contactSena.sql` is both the canonical DDL and the source of baseline users/catalog/test rows. `database/datos.sql` is supplemental seed data; inspect both before assuming IDs or database contents.

## Repository map and feature entry points

- Supervisor pages: `public/modulos/supervisor/panelSupervisor.html` → `panel.js`; `asesores.html` → `asesores.js`; `clientes.html` → `clientes.js`; `campañas.html` → `campanas.js`; `tipificaciones.html` → `tipificaciones.js`; `indicadores.html` → `indicadores.js`; `tiempoSupervisor.html` → `tiempos.js`; `historialSupervisor.html` → `historial.js`.
- Agent pages: `public/modulos/agente/contactos.html` → `contactos.js`; `tiempoAgente.html` → `tiempos.js`; `historialAgente.html` → `historial.js`.
- Shared browser utilities live directly in `public/js/` (including `app.js`, `storage.js`, and `validaciones.js`). `public/js/modules/tabs.js` handles shared tab behavior. Do not assume a filename based on a page name; inspect the page's script tags.
- API route files are mounted in `server.js` under these prefixes: `/api/auth`, `/api/tiempos`, `/api/clientes`, `/api/campanas`, `/api/historial`, `/api/indicadores`, `/api/asesores`, `/api/panel`, `/api/catalogos`, `/api/interacciones`, and `/api/tipificaciones`.
- Endpoint ownership is defined in each route file, not in the frontend. Before changing an endpoint, inspect its route, controller, model, middleware, and callers. Relevant route files include `src/routes/*Routes.js`; do not duplicate authorization checks inconsistently in controllers.
- Common endpoint groups: auth/session/profile (`authRoutes`); operational and geographic catalogs (`catalogRoutes`); supervisor contact listing/creation/update/CSV and agent assigned contacts (`clientRoutes`; there is currently no contact-delete endpoint); campaign CRUD/PDF and assigned typifications (`campaignRoutes`); interactions, agent cases, and contact trace (`interactionRoutes`); supervisor and agent history (`historyRoutes`); indicators (`indicatorRoutes`); time records (`timeRoutes`); dashboard and assignments (`panelRoutes`); advisor management (`advisorRoutes`); typification/status management (`tipificationRoutes`).

## Functional map and data model

- The database's primary operational entities are `agente`, `supervisor`, `campana`, `baseDatosCliente`, `baseDatosAsesor`, `asignacionLlamada`, `tipificacion`, `campanaTipificacion`, `interaccion`, `caso`, `registroAgente`, and `registroSupervisor`.
- `baseDatosCliente` is the legacy database/table/API naming for what the user-facing application calls a **Contacto**. Preserve legacy names in SQL/API/code when needed for compatibility, but use “Contacto(s)” in user-visible labels, headings, search options, and messages.
- Contacts are associated with campaigns and optionally with document type and neighborhood. Geographic selectors follow department → municipality → neighborhood dependencies. When editing a contact, restore all existing catalog selections before saving so unchanged values are not overwritten with empty values.
- Agent campaign membership is stored in `baseDatosAsesor`; call assignments are stored in `asignacionLlamada`. Agent endpoints must only return records belonging to the authenticated agent, even if a request includes an agent identifier.
- A campaign has a name, start date, end date, optional PDF, and a set of assigned typifications. Campaign dates are submitted as `startDate` and `endDate`; the frontend date controls should prevent past dates where required and validate the range before submission.
- Typifications belong to a campaign through `campanaTipificacion` and map to a case status through `tipificacion.idEstCasTip`. Do not assume IDs are fixed outside the canonical seed data; resolve catalog values from the database/API where practical.
- Interactions belong to an agent-campaign assignment, a contact, a typification, and optionally a channel. They record reason, date, start/end times, duration, and observation. The interaction and any required case must be created atomically in `src/models/interactionModel.js`.
- Cases are created for `En proceso` and `Sin gestión`; `Efectivo` does not create a case. Follow-up scheduling is required for `En proceso`. Do not change this mapping without updating validation, case creation, history, and indicators together.
- Agent case cards may show “Ver protocolo PDF” when the associated campaign has a PDF. The URL comes from `campana.proCam` (aliased as `campaignPdf` by `listarCasosAgente` in `src/models/interactionModel.js`) and points to the uploaded campaign file under `public/uploads/campaigns`; preserve that DB-to-API-to-card link rather than constructing a URL from the campaign name or case ID.
- Indicators derive call counts, contact outcomes, durations, and follow-up/case metrics from interaction and case records. Keep seeded/test data consistent with the IDs and foreign-key relationships in `database/contactSena.sql`.
- Database columns use legacy Spanish abbreviations, while model queries generally alias them to descriptive API fields (`id`, `name`, `campaignId`, `status`, etc.). Match existing aliases and JSON response contracts rather than exposing new raw column names casually.
- The login/session user shape and role values are consumed by both frontend access checks and backend middleware. When changing profile/auth responses, inspect `authController`, `authModel`, `middleware/auth.js`, and `public/js/app.js` together.

## User-interface conventions and behavior

- Use Spanish for user-facing text and the visible term “Contacto” rather than “Cliente” in contact workflows. Legacy API routes and DOM IDs such as `/api/clientes` and `cliente-*` remain in use; do not rename them just to change displayed terminology.
- Searchable catalog controls should keep their underlying `<select>` or hidden form value synchronized with the selected suggestion. Do not submit free-form text where an actual catalog ID is required.
- Autocomplete suggestions must not open unexpectedly when a page/modal is loaded. Show suggestions in response to explicit user interaction (such as clicking the search field) or as the user types; hide them when the control is cleared or focus moves away.
- History interaction tables show the status as a pill beneath the typification, not as a separate status column. Keep table headers, empty-state `colspan`, row renderers, and responsive styles in sync when changing columns.
- The history trace modal should use a generic “Trazabilidad de llamadas” title and omit the case/contact/agent summary banner and agent identity details unless explicitly requested.
- Agent “today” interaction listings are ordered by interaction code descending (`i.codInt DESC`), so newer/high codes appear first and low codes later. Other history queries may have their own ordering; inspect the specific model query before changing sort behavior.
- Contact follow-up information belongs in the follow-up workflow, but the contact information card should not add “Caso activo” or “Alarma” fields unless requested.
- Reuse shared form, modal, table, badge, and autocomplete styles in `public/css/style.css`. For icon-bearing selects, ensure the leading icon is not obscured by the select and the dropdown affordance remains on the right.
- Campaign cards show elapsed campaign-period progress, not remaining days. The remaining-validity label is separate; do not describe or relabel the progress percentage as time remaining.
- When changing a visible table, audit its HTML header, JavaScript renderer, search/filter behavior, empty-state column span, styles, and both role-specific pages if they share a module.
- Keep user-requested UI removals local to the specified view. For example, the agent follow-up contact card omits “Caso activo” and “Alarma”, while case follow-up details and alarms elsewhere remain operational.
- User-visible terminology is an explicit requirement: prefer “Contacto” to “Cliente” even where internal identifiers retain `cliente`, `client`, or `/api/clientes`. Review labels, headings, placeholders, suggestion text, alerts, and empty states—not only table headers.

## API and request conventions

- Routes mount at `/api` in `server.js`; route modules attach `autenticar`, `requerirRol(...)`, upload middleware, then controller handlers as appropriate. Preserve the established order and role restrictions.
- GET endpoints commonly respond with `{ data: ... }`; auth endpoints may return `{ user: ... }`; errors use `{ error: ... }`. Frontend code should check `response.ok` and display the returned error where appropriate.
- Campaign and CSV uploads use multipart `FormData`; do not set a JSON `Content-Type` for multipart requests. Campaign PDFs use field `file` and max 10 MB; contact CSV uses field `file` and max 5 MB.
- Agent interaction endpoints derive the authenticated agent from the session. Do not trust a body/query `agentId` as authorization; where an ID is accepted for compatibility, compare it with `req.auth.id` and keep the SQL scoped.
- Contact update requests keep existing field names such as `documentTypeId`, `campaignId`, `neighborhoodId`, `phoneAlt`, and `observation`, despite the legacy API URL `/api/clientes`.
- Date-only values are represented as `YYYY-MM-DD` in HTML/API forms. Avoid UTC date conversion when displaying date-only values; use local calendar components or the existing page helpers.

## Security and API constraints

- Authentication is JWT in the `contact_sena_session` HttpOnly cookie; Bearer tokens are also accepted. Protected routes must use `autenticar` and the appropriate `requerirRol`.
- Non-GET API requests pass the global origin/CSRF middleware. Do not bypass it for new state-changing endpoints.
- Agent data must remain scoped to the authenticated agent; supervisor-only endpoints include indicators and global time/client/campaign administration.
- Do not commit `.env`, passwords, JWT secrets, or database credentials.
- Do not weaken global middleware or make protected routes public to work around a frontend issue. Check same-origin/CSRF behavior for every new POST/PATCH/PUT/DELETE request.
- Uploaded file names, CSV content, and user-entered values are untrusted input. Follow existing upload limits, validation, parameterized SQL, and HTML-escaping practices.

## Data and uploads

- The canonical schema and seed users are in `database/contactSena.sql`; do not assume a clean database when testing changes.
- Campaign PDF uploads use multipart field `file`, are limited to 10 MB, and are stored in `public/uploads/campaigns`.
- Client CSV imports use multipart field `file`, are kept in memory, and are limited to 5 MB.
- Interaction creation and case creation must remain atomic through `src/models/interactionModel.js`.
- Valid interaction results are `Efectivo`, `En proceso`, and `Sin gestión`: only the latter two create a case. An empty `Seleccione...` result is invalid. The simulated call must be explicitly started and ended before saving.
- Pause time is accumulated in `registroAgente.tiempoPausaRegAge` and `registroSupervisor.tiempoPausaRegSup`; do not reintroduce an `inicioPausa` column. Pause handling spans `src/models/sessionModel.js`, the time modules, and startup schema compatibility logic.
- `ensureOperationalSchema()` in `src/config/database.js` is startup compatibility logic for existing installations. If a schema change is needed, inspect this logic and the canonical SQL together; do not assume startup ALTERs are a full migration framework.
- Never run test inserts or modify a database unless explicitly requested. Test SQL should respect foreign keys and should not assume auto-increment IDs unless it is explicitly designed for the canonical seed database.

## Change checklist

- Before modifying a feature, inspect its HTML, frontend module, route, controller, and model.
- When changing a table column, update its header, renderer, filters, and related styles together.
- After JavaScript changes, run the syntax check above and hard-refresh affected pages (`Ctrl+F5`); there is no automated test suite.
- For a bug report, first identify the exact page/role and reproduce the UI path from the relevant page and module. Trace displayed fields back through the API response and model query before changing storage or schema.
- Keep changes narrowly scoped to the request. Treat existing local edits and data as user work; do not reset, discard, or overwrite unrelated changes.
- Report verification honestly: syntax checks do not prove database connectivity, SQL correctness against a live database, or browser-level behavior. State any untested runtime assumptions.
