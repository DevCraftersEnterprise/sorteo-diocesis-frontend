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

## Estado

Proyecto en migración activa desde la app Flutter. Ver las Etapas del
plan de migración para el alcance de cada etapa.
