# Contact-SENA

Aplicación web para apoyar la formación y práctica de aprendices de Contact Center del SENA. Permite administrar clientes, campañas, asesores, contactos, indicadores, historial y tiempos de gestión.

## Requisitos

- Node.js 18 o superior.
- MySQL 8 o compatible.
- npm.

## Instalación

1. Instala las dependencias:

```bash
npm install
```

2. Crea la base de datos ejecutando el script:

```bash
mysql -u root -p < database/contactSena.sql
```

También puedes abrir `database/contactSena.sql` desde MySQL Workbench y ejecutarlo.

3. Crea el archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configura en `.env` los datos de conexión a MySQL y reemplaza `JWT_SECRET` por una cadena aleatoria de mínimo 32 caracteres cuando uses producción.

## Ejecución

Inicia el servidor:

```bash
npm start
```

Para desarrollo, con reinicio automático al detectar cambios:

```bash
npm run dev
```

Abre `http://localhost:3000` en el navegador. Al iniciar, el servidor verifica la conexión a MySQL y ajusta automáticamente algunos cambios operativos del esquema.

## Variables De Entorno

| Variable | Descripción | Valor predeterminado |
| --- | --- | --- |
| `PORT` | Puerto del servidor | `3000` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_NAME` | Nombre de la base de datos | `contactSena` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | Vacía |
| `JWT_SECRET` | Secreto para firmar sesiones | Obligatorio |
| `NODE_ENV` | Entorno de ejecución | Opcional |
| `FRONTEND_ORIGIN` | Origen permitido para CORS | Opcional |

## Usuarios De Prueba

El script SQL incluye estos usuarios locales:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Supervisor | `0001` | `juan123` |
| Supervisor | `0002` | `carlos123` |
| Agente | `0003` | `maria123` |
| Agente | `0004` | `luis123` |

Estas credenciales son únicamente para desarrollo. Deben cambiarse o eliminarse antes de publicar la aplicación.

## Funcionalidades

- Inicio y cierre de sesión con cookie segura y control de roles.
- Gestión de clientes y carga masiva mediante CSV.
- Gestión de campañas con tipificaciones y archivos PDF.
- Creación y actualización de asesores.
- Registro de contactos, casos y seguimiento.
- Consulta de historial e indicadores.
- Registro y consulta de tiempos de gestión.
- Catálogos de departamentos, municipios, barrios y estados operativos.

## Estructura Del Proyecto

```text
Contact-SENA/
├── database/
│   └── contactSena.sql          # Esquema y datos iniciales de MySQL
├── public/
│   ├── Index.html                # Pantalla de inicio de sesión
│   ├── css/                      # Estilos de la aplicación
│   ├── img/                      # Recursos gráficos
│   ├── js/
│   │   ├── app.js                # Sesión, navegación, modales y formularios comunes
│   │   ├── storage.js            # Utilidades de almacenamiento y sesión en memoria
│   │   ├── validaciones.js       # Validaciones de formularios
│   │   └── modules/              # Lógica JavaScript específica de cada módulo
│   ├── modulos/
│   │   ├── agente/               # Vistas del rol agente
│   │   └── supervisor/           # Vistas del rol supervisor
│   ├── templates/                # Plantillas descargables
│   └── uploads/campaigns/        # PDFs cargados para campañas
├── src/
│   ├── config/                   # Configuración de base de datos
│   ├── controllers/              # Lógica de las solicitudes HTTP
│   ├── middleware/               # Autenticación, CSRF, límites y cargas de archivos
│   ├── models/                   # Consultas y acceso a datos
│   ├── routes/                   # Rutas de la API
│   └── utils/                    # Utilidades compartidas
├── .env.example                  # Plantilla de variables de entorno
├── package.json                  # Dependencias y comandos npm
├── server.js                     # Punto de entrada del servidor Express
└── README.md
```

## API Principal

Las rutas de la API están protegidas según el rol y la sesión:

- `/api/auth`
- `/api/clientes`
- `/api/campanas`
- `/api/asesores`
- `/api/interacciones`
- `/api/historial`
- `/api/indicadores`
- `/api/tiempos`
- `/api/panel`
- `/api/catalogos`

La ruta `GET /api/health` comprueba que el servidor puede conectarse a la base de datos.

## Verificaciones

No hay una suite de pruebas automatizadas configurada actualmente. Para comprobar la sintaxis de los archivos JavaScript puedes ejecutar:

```bash
node --check server.js
```

Para validar todos los archivos del proyecto, ejecuta `node --check` sobre los archivos `.js` de `src/` y `public/js/`.
