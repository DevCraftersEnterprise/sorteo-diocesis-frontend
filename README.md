# Sorteo Diócesis — Frontend

PWA en Vue 3 + Vite que reemplaza a la app Flutter (`sorteos_app`) como
cliente del backend NestJS (`sorteo-diocesis-backend`).

## Requisitos

- Node 22+
- El backend NestJS corriendo localmente (ver su propio README)

## Desarrollo

```bash
npm install
cp .env.example .env   # ajusta VITE_API_URL si tu backend usa otro puerto
npm run dev
```

## Scripts

| Script                 | Qué hace                                |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Servidor de desarrollo con hot-reload    |
| `npm run build`         | Type-check + build de producción         |
| `npm run preview`       | Sirve el build de producción localmente  |
| `npm run lint`          | ESLint con autofix                       |
| `npm run format`        | Prettier sobre `src/`                    |
| `npm test`              | Corre la suite de Vitest una vez         |
| `npm run test:watch`    | Vitest en modo watch                     |
| `npm run test:coverage` | Vitest con reporte de cobertura          |
| `npm run typecheck`     | Solo type-check (sin build)              |

## Deploy (Netlify)

El sitio se despliega en Netlify conectado directo a este repo.
`netlify.toml` ya trae el build command, el publish dir (`dist`) y el
redirect de SPA que necesita `vue-router` en modo history (sin eso,
entrar directo a `/admin` o refrescar ahí da 404).

Variables de entorno a configurar en Netlify (Site settings >
Environment variables) — mismos nombres que `.env.example`, con los
valores reales de producción:

- `VITE_API_URL` — URL del backend en Render, con el prefijo `/api`
  (ej. `https://sorteos-flutter-app-backend.onrender.com/api`).
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID` — los mismos valores que ya
  tengas en tu `.env` local (misma app de Firebase que usa el
  backend).

Cada push a `main` dispara un deploy nuevo automáticamente una vez
conectado el sitio.

## Estado

Proyecto en migración activa desde la app Flutter. Ver las Etapas del
plan de migración para el alcance de cada etapa.
