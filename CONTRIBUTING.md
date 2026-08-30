# Contribuir

Guía rápida de las convenciones de este repo. Aplica tanto si trabajas solo como si se suma más gente al equipo.

## Ramas

Convención: `<tipo>/frontend/<NN>-<nombre-corto>`

- `migration/frontend/…` — trabajo de migración desde la app Flutter (`sorteos_app`), siguiendo el roadmap del plan de migración.
- `fix/frontend/…` — corrección de un bug puntual.
- `test/frontend/…` — solo agrega tests, sin tocar comportamiento.
- `refactor/frontend/…` — reordena/limpia código existente sin cambiar comportamiento externo.
- `chore/frontend/…` — tooling, CI, dependencias, configuración.

Cada rama nace de `main`, nunca de otra rama de feature — evita cadenas de dependencias entre ramas de trabajo.

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/): `tipo(alcance): descripción`.

Tipos usados en este repo: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.

## Antes de mergear a main

```bash
npm run format:check
npm run lint:ci
npm run typecheck
npm test
npm run build
```

Es exactamente lo que corre el CI (`.github/workflows/ci.yml`) — si pasa local, pasa en GitHub.

## Backend

El frontend consume el backend NestJS (`sorteo-diocesis-backend`). Para desarrollo local, correrlo aparte y apuntar `VITE_API_URL` (en `.env`) a su URL local — ver el README de este repo.

## Versionado

[SemVer](https://semver.org/lang/es/). Los tags/releases se crean solo en hitos grandes de la migración (no en cada tarea ni en cada Etapa).
