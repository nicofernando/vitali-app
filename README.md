# vitali-app

Plataforma interna para Vitali Suites — cotizador, gestión de clientes, emisión de cotizaciones en PDF y administración de proyectos inmobiliarios.

## Stack

- Vue 3.5 + Vite 6 + Tailwind CSS v4 + shadcn-vue (reka-ui v2)
- Pinia v3 + Vue Router 4
- Supabase (PostgreSQL + Auth + Edge Functions)
- pnpm workspaces

## Estructura

```
vitali-app/
├── apps/app/          ← Vue SPA (prioridad actual)
├── apps/web/          ← Astro — sitio marketing (futuro)
├── packages/brand/    ← tokens de color y tipografías
└── supabase/          ← migraciones y Edge Functions
```

## Desarrollo

```bash
pnpm install
cp apps/app/.env.example apps/app/.env.local

# Levantar Supabase local (Docker debe estar corriendo)
supabase start
supabase db reset
# Copiar las keys de `supabase status` a apps/app/.env.local

pnpm dev
```

## Entornos

| Rama | Entorno | URL |
|------|---------|-----|
| `feat/*` | local | localhost:5173 |
| `qa` | staging | staging.vitalisuites.com |
| `main` | producción | app.vitalisuites.com |
