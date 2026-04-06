# Skill Registry — vitali-app
Generated: 2026-04-04

## Project Standards (auto-resolved)

Estas reglas compactas deben inyectarse en cada sub-agente antes de sus instrucciones específicas.

### Compact Rules

#### Vue 3 + TypeScript
- SIEMPRE `<script setup lang="ts">` — nunca Options API, nunca JS puro
- `shallowRef` sobre `ref` si no se necesita reactividad profunda
- Composables para lógica reutilizable, no mixins
- `defineProps` / `defineEmits` con tipos explícitos

#### Pinia Stores
- Composition API style (`defineStore` con setup function), no Options style
- Una store por dominio (projects, units, clients, quotes, auth, etc.)
- Actions para toda lógica async — nunca lógica en componentes
- `storeToRefs` para destructuring reactivo

#### Supabase / PostgreSQL
- RLS activado en TODA tabla nueva desde el día 1
- Índices en FK y columnas de filtro frecuente
- RPCs para lógica de negocio compleja — especialmente cálculos financieros
- Migraciones aditivas dentro de sprint — DROP/RENAME solo con certeza
- Usar `select()` con columnas explícitas, nunca `select('*')` en producción
- Edge Functions para toda lógica de cálculo financiero (nunca en el frontend)

#### shadcn-vue / UI
- LEER shadcn-vue-skilld ANTES de usar cualquier componente shadcn-vue
- Colores en OKLCH (v4 shadcn-vue usa OKLCH, no HSL)
- `data-active` en NavigationMenuLink
- reka-ui v2 como base de componentes

#### Tailwind CSS v4
- Configuración en CSS con `@theme`, no tailwind.config.ts
- Design tokens con `--color-*`, `--spacing-*` en `@theme`
- Dark mode: `@custom-variant dark (&:where(.dark, .dark *))`
- Sin `@tailwind base/components/utilities` — usar `@import "tailwindcss"`
- Brand tokens: `--color-vitali-blue: #002B5B`, `--color-vitali-gold: #D4BE77`
- Tipografías: Raleway (headings), Lato (body)

#### Testing (Vitest + Vue Test Utils)
- TDD para todo lo que tenga comportamiento verificable — no es un filtro por módulo, es una práctica de desarrollo
- OBLIGATORIO: Edge Functions con lógica de cálculo, composables con reglas de negocio, lógica de permisos/RBAC, stores con lógica async compleja
- RECOMENDADO: componentes Vue con comportamiento (validaciones, condicionales, interacciones)
- NO necesario: CRUD simple sin lógica, componentes puramente presentacionales
- Criterio: "¿puedo definir qué debe hacer antes de escribirlo?" → si sí, TDD
- Environment: jsdom, globals: true
- `pnpm test:run` en pre-commit (no modo watch)
- No snapshots como único mecanismo de verificación
- `flushPromises()` para esperar actualizaciones async del DOM

#### Commits & Workflow
- Conventional Commits en español: `feat(scope): descripción`
- Un commit = un cambio lógico completo y funcional
- Checklist pre-commit: `pnpm typecheck && pnpm lint && pnpm test:run`
- Ramas: `feat/*` (local) → `qa` (staging) → `main` (producción)
- main = solo sprints cerrados con QA aprobado

#### Arquitectura (ley inquebrantable)
- Frontend NUNCA calcula — solo lee resultados de Edge Functions y hace CRUD de inputs
- Toda lógica de cálculo del cotizador en Edge Functions de Supabase (Deno) — nunca en el frontend
- Permisos via RBAC: tabla `roles` + tabla `permissions` + RLS
- Cliente tonto por diseño — no romper este principio bajo ninguna circunstancia

#### Monorepo
- pnpm workspaces: `apps/app` (Vue SPA), `apps/web` (Astro — futuro)
- `packages/brand` para tokens de color, tipografías y assets compartidos
- `supabase/` en la raíz del monorepo (migraciones + edge functions)

---

## Skill Index

### Skills Globales (~/.claude/skills/)

| Skill | Trigger | Path |
|-------|---------|------|
| sdd-init | Inicializar SDD en el proyecto | `~/.claude/skills/sdd-init/SKILL.md` |
| sdd-explore | Investigar feature/problema antes de implementar | `~/.claude/skills/sdd-explore/SKILL.md` |
| sdd-propose | Crear propuesta de cambio con intent y scope | `~/.claude/skills/sdd-propose/SKILL.md` |
| sdd-spec | Escribir specs (delta requirements y scenarios) | `~/.claude/skills/sdd-spec/SKILL.md` |
| sdd-design | Crear diseño técnico con decisiones de arquitectura | `~/.claude/skills/sdd-design/SKILL.md` |
| sdd-tasks | Descomponer change en checklist de tareas | `~/.claude/skills/sdd-tasks/SKILL.md` |
| sdd-apply | Implementar tareas del change (escribir código real) | `~/.claude/skills/sdd-apply/SKILL.md` |
| sdd-verify | Validar implementación contra specs y diseño | `~/.claude/skills/sdd-verify/SKILL.md` |
| sdd-archive | Mergear delta specs a main specs y archivar | `~/.claude/skills/sdd-archive/SKILL.md` |
| judgment-day | Review adversarial paralelo (dos jueces independientes) | `~/.claude/skills/judgment-day/SKILL.md` |
| branch-pr | Crear PR con workflow issue-first | `~/.claude/skills/branch-pr/SKILL.md` |
| issue-creation | Crear GitHub issue (bug o feature) | `~/.claude/skills/issue-creation/SKILL.md` |
| skill-creator | Crear nueva skill para documentar patrones | `~/.claude/skills/skill-creator/SKILL.md` |

### Skills del Proyecto (.claude/skills/)
⚠️ Pendiente: copiar desde `proyector-fin/.claude/skills/` — mismo stack, aplican todas excepto las marcadas abajo.

| Skill | Trigger | Path |
|-------|---------|------|
| sprint-workflow | Crear rama, commit, QA fallido, cerrar sprint, PR | `.claude/skills/sprint-workflow/SKILL.md` |
| vue | Cualquier SFC Vue, Composition API, macros | `.claude/skills/vue/SKILL.md` |
| vue-best-practices | Code review de componentes Vue | `.claude/skills/vue-best-practices/SKILL.md` |
| vue-router-best-practices | Rutas, guards, navegación, lazy loading | `.claude/skills/vue-router-best-practices/SKILL.md` |
| vue-testing-best-practices | Tests de componentes Vue (Vitest + Vue Test Utils) | `.claude/skills/vue-testing-best-practices/SKILL.md` |
| vueuse-functions | Composables de utilidad (useDebounceFn, useLocalStorage, etc.) | `.claude/skills/vueuse-functions/SKILL.md` |
| pinia | Stores, actions, getters, persistencia | `.claude/skills/pinia/SKILL.md` |
| shadcn-vue-skilld | CUALQUIER componente shadcn-vue — leer SIEMPRE antes | `.claude/skills/shadcn-vue-skilld/SKILL.md` |
| supabase-postgres-best-practices | Cualquier SQL, migración, RLS, índice, RPC, Edge Function | `.claude/skills/supabase-postgres-best-practices/SKILL.md` |
| vitest | Tests unitarios, mocking, coverage, configuración | `.claude/skills/vitest/SKILL.md` |
| vite | vite.config.ts, aliases, plugins, monorepo | `.claude/skills/vite/SKILL.md` |
| tailwind-design-system | Design tokens, @theme CSS, OKLCH colors, dark mode | `.claude/skills/tailwind-design-system/SKILL.md` |
| frontend-design | Decisiones de diseño visual, layouts, componentes nuevos | `.claude/skills/frontend-design/SKILL.md` |
| antfu | ESLint config, convenciones de código (@antfu/eslint-config) | `.claude/skills/antfu/SKILL.md` |
| pnpm | Gestión de dependencias, workspaces, lockfile | `.claude/skills/pnpm/SKILL.md` |
| web-design-guidelines | Review de UI, accesibilidad, principios de diseño | `.claude/skills/web-design-guidelines/SKILL.md` |
| engram-sync | Setup engram en máquina nueva, importar memorias | `.claude/skills/engram-sync/SKILL.md` |

### Skills NO aplicables a este proyecto

| Skill | Razón |
|-------|-------|
| nuxt | No hay SSR — SPA puro con Vite |
| slidev | No se hacen presentaciones aquí |
| tsdown | No es una librería |
| turborepo | pnpm workspaces sin turborepo |
| unocss | Se usa Tailwind v4 |
| vitepress | No hay documentación estática |
| go-testing | No hay código Go |

---

## Context Map (para orchestrator)

| Contexto / Archivos tocados | Skills a inyectar |
|-----------------------------|-------------------|
| `*.vue`, `src/components/**` | vue, vue-best-practices, shadcn-vue-skilld |
| `src/stores/**` | pinia, vue |
| `src/router/**` | vue-router-best-practices |
| `**/*.test.ts`, `**/*.spec.ts` | vitest, vue-testing-best-practices |
| `supabase/migrations/**`, `*.sql` | supabase-postgres-best-practices |
| `supabase/functions/**` | supabase-postgres-best-practices |
| `src/assets/**`, `*.css`, diseño visual | tailwind-design-system, frontend-design |
| `eslint.config.*`, tooling | antfu |
| `vite.config.*`, `pnpm-workspace.yaml` | vite, pnpm |
| git commit, rama, PR, sprint | sprint-workflow |
| composables usando VueUse | vueuse-functions |
| Edge Functions cotizador, lógica de cálculo | vitest, vue-testing-best-practices |
| imágenes, uploads CMS | (futuro: image-optimization skill) |
