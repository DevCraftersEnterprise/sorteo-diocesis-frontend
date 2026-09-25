# Sorteo Diócesis — Frontend 🎟️

[![CI](https://github.com/DevCraftersEnterprise/sorteo-diocesis-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/DevCraftersEnterprise/sorteo-diocesis-frontend/actions/workflows/ci.yml)

Aplicación web del sistema de sorteos de la **Diócesis de Ciudad Obregón**: formulario público de registro de participantes (con foto de INE tomada desde el celular) y panel de administración para exportar registros, buscar carteras sin pagar, marcarlas como pagadas y purgar la base al cierre del sorteo.

Es una SPA en Vue 3 + Vite que reemplaza a la app Flutter `sorteos_app` como cliente del backend NestJS [`sorteo-diocesis-backend`](https://github.com/DevCraftersEnterprise/sorteo-diocesis-backend).

## 📑 Tabla de Contenidos

- [Stack Tecnológico](#️-stack-tecnológico)
- [Instalación y Desarrollo](#-instalación-y-desarrollo)
- [Variables de Entorno](#-variables-de-entorno)
- [Pantallas y Funcionalidades](#-pantallas-y-funcionalidades)
- [Arquitectura](#-arquitectura)
- [Scripts](#-scripts)
- [Pruebas](#-pruebas)
- [Despliegue (Netlify)](#-despliegue-netlify)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Solución de Problemas](#-solución-de-problemas)

## 🛠️ Stack Tecnológico

- **Vue 3** (`<script setup>`) + **TypeScript** + **Vite**
- **vue-router 4** — modo history
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`) + **@heroicons/vue**
- **Firebase JS SDK** — solo Authentication (login de administradores)
- **Vitest** + **@vue/test-utils** + **jsdom** — pruebas unitarias y de componentes
- **ESLint** + **Prettier** + **Husky/lint-staged**

Sin librería de estado global ni cliente HTTP externo: el estado compartido vive en un composable y las llamadas usan `fetch`.

## 📦 Instalación y Desarrollo

Requisitos: **Node 22+** y el backend NestJS corriendo en local (ver su README).

```bash
npm install
cp .env.example .env   # completa VITE_API_URL y la config de Firebase
npm run dev            # http://localhost:5173
```

El backend acepta por defecto peticiones desde `http://localhost:5173` (su `CORS_ORIGINS`), así que con los puertos por defecto de ambos proyectos no hay que configurar nada más. Si levantas Vite en otro puerto, agrégalo a `CORS_ORIGINS` del backend.

## 🔧 Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base del backend **incluyendo el prefijo `/api`**. Local: `http://localhost:3000/api`. |
| `VITE_FIREBASE_API_KEY` | Config web de Firebase (Console → Project settings → General → Your apps → Web app). |
| `VITE_FIREBASE_AUTH_DOMAIN` | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | 〃 — debe ser **el mismo proyecto** con el que el backend verifica los tokens. |
| `VITE_FIREBASE_APP_ID` | 〃 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 〃 |

> ℹ️ Las variables `VITE_*` se incrustan en el JavaScript del build y cualquiera puede leerlas. La config web de Firebase es pública por diseño; **nunca** pongas aquí secretos (llaves privadas, API secrets de Cloudinary, etc.). Al cambiar una variable hay que volver a hacer build.

## ✨ Pantallas y Funcionalidades

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/` | Registro de participante | Público |
| `/admin` | Panel de administración | Login de administrador |
| `/admin/unpaid` | Carteras sin pagar | Login de administrador |

### Registro (`/`)

Formulario con nombre, número de cartera, teléfono y foto de la INE. En el celular el selector de foto abre directamente la cámara trasera (`capture="environment"`).

Al enviar:

1. Valida que estén todos los campos y la foto.
2. Normaliza la cartera con `padWallet` (`"7"` → `"007"`); debe estar entre **1 y 840**, la misma regla que valida el backend.
3. Pide una firma de subida al backend (`POST /sign-upload`).
4. Sube la foto **directo a Cloudinary** desde el navegador (el archivo nunca pasa por el backend).
5. Registra al participante (`POST /participants`) con el `public_id` y la versión de la foto.

Si la cartera ya está tomada el backend responde `409` y se muestra su mensaje ("La cartera 007 ya está registrada"). La disponibilidad no se consulta antes de enviar: el registro es la única comprobación confiable (ver la condición de carrera documentada en el backend). Si falla la subida a Cloudinary no se crea el registro.

### Panel de administración (`/admin`)

- **Login** con email y contraseña de Firebase Authentication. La cuenta necesita el custom claim `admin: true`, que se otorga desde el backend (`npm run admin:set-claim -- <email>`); sin él, el login funciona pero todas las acciones responden `403`.
- **Descargar ZIP**: Excel con todos los registros (incluye teléfono completo) + carpeta de fotos. Se guarda como `sorteo_export_<timestamp>.zip`. Con muchos participantes tarda, porque el backend descarga las fotos de Cloudinary.
- **Purgar base**: borra **todos** los registros y sus fotos, tras una confirmación. No se puede deshacer; exporta el ZIP antes. Al terminar muestra cuántos registros y fotos se borraron.
- Enlace a **Carteras sin pagar** y botón de **Cerrar sesión**.

### Carteras sin pagar (`/admin/unpaid`)

- Búsqueda por nombre o por prefijo de cartera (con *debounce* de 350 ms). El backend devuelve como máximo 500 resultados, ordenados por número de cartera.
- **Marcar como pagada** con confirmación; el backend registra quién la marcó a partir del token, y la lista se recarga.
- Si no hay sesión, muestra un enlace para ir a iniciar sesión en `/admin`.

## 🧭 Arquitectura

El código se organiza en capas; cada una solo depende de las de abajo:

```
pages/        Vistas (HomeView, AdminView, UnpaidView): formularios, mensajes, confirmaciones
   │
composables/  useAdminSession: estado de sesión compartido + authHeaders()
services/     authService (Firebase Auth), cloudinaryUpload (subida directa)
api/          participants.ts, admin.ts: una función por endpoint, tipos del contrato
   │
api/httpClient.ts   request(), buildUrl(), parseApiError(), ApiError
lib/firebase.ts     Inicialización perezosa de Firebase
utils/              padWallet, downloadBlob
```

- **`httpClient.ts`** es la única capa que conoce la URL base y el formato de error del backend. Toda respuesta no-OK se convierte en un `ApiError` con `statusCode`, `errorCode` (el `error` en `snake_case` del backend, p. ej. `wallet_already_taken`), `message` listo para mostrar y `requestId` para cruzar con los logs del backend.
- **Módulos `api/`**: cada función refleja un endpoint y sus tipos copian el contrato del backend (los comentarios indican de qué archivo del backend salen). Cuando el backend devuelve `snake_case` (`/admin/unpaid`, por compatibilidad con Flutter) se mapea a `camelCase` aquí, para que el resto del frontend no lo note. `exportZip` usa `fetch` directo porque la respuesta es binaria.
- **`useAdminSession()`**: estado a nivel de módulo, así que todas las vistas ven la misma sesión. Escucha `onAuthStateChanged` de Firebase y expone `isLoggedIn`, `login`, `logout` y `authHeaders()`, que devuelve `{ Authorization: 'Bearer <token>' }` forzando el refresh del ID token para no enviar uno expirado.
- **Firebase se inicializa al primer uso**, no al importar: el build y las pruebas no dependen de tener sus variables configuradas.
- **Las rutas de admin no tienen guard en el router**: cada vista revisa `isLoggedIn` para decidir qué mostrar, y la protección real está en el backend (token + claim `admin`).

## 📜 Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Type-check (`vue-tsc`) + build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run typecheck` | Solo type-check |
| `npm run lint` / `npm run lint:ci` | ESLint con autofix / sin autofix (CI) |
| `npm run format` / `npm run format:check` | Prettier sobre `src/` escribiendo / solo verificando (CI) |
| `npm test` | Suite de Vitest una vez |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:coverage` | Vitest con cobertura (texto + HTML en `coverage/`) |

Husky corre `lint-staged` (Prettier + ESLint sobre los `.ts`/`.vue` en stage) en cada commit.

## 🧪 Pruebas

- Cada módulo tiene su `.spec.ts` junto al archivo (`src/api/admin.spec.ts`, `src/pages/HomeView.spec.ts`, …).
- Entorno `jsdom` con `globals: true`. Las pruebas no llaman al backend ni a Firebase/Cloudinary reales: se mockean `fetch` y los módulos de servicio.
- `buildUrl` lee `VITE_API_URL` en cada llamada, así que se puede cambiar por test con `vi.stubEnv`.

### CI

`.github/workflows/ci.yml` corre en cada push y PR a `main`:

`format:check` → `lint:ci` → `typecheck` → `test` → `build`

Si pasa en local, pasa en GitHub (ver [CONTRIBUTING.md](./CONTRIBUTING.md)).

## 🚀 Despliegue (Netlify)

El sitio se despliega en Netlify conectado directo a este repo: **cada push a `main` publica una versión nueva**.

`netlify.toml` ya define:

- Build command `npm run build`, publish dir `dist`, Node 22.
- Redirect de todas las rutas a `/index.html` (status 200). Sin él, entrar directo o refrescar en `/admin` o `/admin/unpaid` da 404, porque vue-router usa modo history.

Variables de entorno en Netlify (Site settings → Environment variables), con los mismos nombres que `.env.example`:

- `VITE_API_URL` — URL del backend en Render **con** `/api` (ej. `https://<servicio>.onrender.com/api`).
- `VITE_FIREBASE_*` — la config web del mismo proyecto de Firebase que usa el backend.

Del lado del backend, su variable `CORS_ORIGINS` en Render debe incluir el dominio de Netlify.

## 📁 Estructura del Proyecto

```
├── index.html            # Punto de entrada HTML (lang="es", título, favicon)
├── netlify.toml          # Build y redirect de SPA para Netlify
├── vite.config.ts        # Plugins Vue + Tailwind, alias @ → src/, config de Vitest
├── public/               # Estáticos servidos tal cual (favicon.ico)
└── src/
    ├── main.ts           # Crea la app y registra el router
    ├── App.vue           # <router-view />
    ├── style.css         # Entrada de Tailwind
    ├── env.d.ts          # Tipos de import.meta.env (VITE_*)
    ├── router/           # Rutas: /, /admin, /admin/unpaid (lazy-loaded)
    ├── pages/            # HomeView, AdminView, UnpaidView
    ├── api/              # httpClient + módulos por feature (participants, admin)
    ├── composables/      # useAdminSession
    ├── services/         # authService (Firebase), cloudinaryUpload
    ├── lib/              # firebase.ts (singleton perezoso)
    └── utils/            # wallet.ts (padWallet), downloadBlob.ts
```

## 🩺 Solución de Problemas

| Síntoma | Causa probable |
|---------|----------------|
| Todas las llamadas fallan en el navegador con error de CORS | El origen del frontend no está en `CORS_ORIGINS` del backend. |
| Las llamadas van a `.../undefined/...` o a una ruta sin `/api` | `VITE_API_URL` no está definida o le falta `/api`; recuerda reconstruir tras cambiarla. |
| Login correcto pero "La cuenta no tiene permisos de administrador" | La cuenta no tiene el claim `admin`. Otórgalo desde el backend y vuelve a iniciar sesión. |
| `Error de autenticación: auth/invalid-credential` | Email o contraseña incorrectos, o el usuario no existe en ese proyecto de Firebase. |
| 404 al refrescar `/admin` en producción | Falta el redirect de `netlify.toml` (o se desplegó en otro hosting sin regla equivalente). |
| "No se pudo subir la foto a Cloudinary" | La firma expiró o las credenciales de Cloudinary del backend son incorrectas. |

## 🚧 Estado

Proyecto en migración activa desde la app Flutter. Pantallas ya migradas: registro, panel de administración (login, exportación, purga) y carteras sin pagar. El alcance de cada etapa está en el plan de migración.

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md): convención de ramas, commits, checklist antes de mergear y versionado.

---

📍 **Proyecto**: Sorteo Diócesis de Ciudad Obregón — Frontend
🏢 **Desarrollado por**: DevCrafters
📅 **Última actualización**: Septiembre 2026
