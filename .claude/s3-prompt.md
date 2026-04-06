# Sprint 3 — Prompt de continuación

## Estado al iniciar esta sesión

- `feat/sprint-2-fase0` → COMPLETA, pusheada, judgment-day APPROVED (115 tests). Hacer QA y merge a main cuando el usuario apruebe.
- `feat/sprint-3` → rama creada desde main, **vacía**. TODO por implementar.

## Lo que hay que hacer ahora

Implementar Sprint 3 completo en `feat/sprint-3`. El plan detallado está en `.claude/s3-prompt.md` (este archivo) y en engram topic_key `sprint/s3-state`.

## Checklist de tareas S3

### Fase 1 — Migraciones SQL (`supabase/migrations/`)
- [ ] `20260401_template_accounts.sql`
- [ ] `20260401_projects.sql`
- [ ] `20260401_scenarios.sql` (+ trigger auto-base)
- [ ] `20260401_scenario_parameters_input_curves.sql`
- [ ] `20260401_rrhh_roles.sql`
- [ ] `20260401_rpc_fork_template.sql`
- [ ] `20260401_rpc_resolve_scenario_params.sql`
- [ ] `20260401_rpc_trigger_recompute_stub.sql`

### Fase 2 — Tipos TypeScript
- [ ] Agregar a `src/types/database.ts`: TemplateAccount, Project, Scenario, ScenarioParameter, InputCurve, RrhhRole

### Fase 3 — Stores Pinia
- [ ] `src/stores/projects.ts` — fetchAll, create, setCurrentProject, forkTemplate, remove
- [ ] `src/stores/scenarios.ts` — fetchByProject, createChild, setCurrent, resolveParams, getter baseScenario
- [ ] `src/stores/accounts.ts` — fetchByTemplate, create, update, remove, reorder

### Fase 4 — Router
- [ ] Agregar `/projects` y `/projects/:id` a `src/router/index.ts`

### Fase 5 — Vistas y Componentes
- [ ] `src/views/ProjectsView.vue`
- [ ] `src/components/projects/CreateProjectDialog.vue`
- [ ] `src/views/ProjectDetailView.vue` (tabs: Parámetros, Cuentas, Curvas, RRHH)
- [ ] `src/components/projects/ScenarioSelector.vue`
- [ ] `src/components/projects/CreateScenarioDialog.vue`
- [ ] `src/components/accounts/AccountsTree.vue`
- [ ] `src/components/accounts/AccountDialog.vue`

## Commits esperados
```
db(sprint3): migraciones — template_accounts, projects, scenarios, input_curves, rrhh_roles, RPCs
feat(types): tipos TS para entidades de Sprint 3
feat(stores): projects, scenarios, accounts stores
feat(router): rutas /projects y /projects/:id
feat(projects): ProjectsView + CreateProjectDialog
feat(projects): ProjectDetailView con tabs
feat(accounts): AccountsTree + AccountDialog
feat(scenarios): ScenarioSelector + CreateScenarioDialog
```

## Arquitectura clave (no olvidar)
- Cliente TONTO: frontend solo CRUD de inputs, nunca calcula
- RLS en todas las tablas desde día 1
- Fork-on-demand: RPC `fork_template(project_id)` — 3 queries atómicas
- Trigger Postgres crea escenario base automáticamente al insertar proyecto
- `resolve_scenario_params(scenario_id)` → merge base + overrides hijo (RPC)
- `trigger_recompute` es stub en S3 — motor real en S5

## Merge strategy final
1. `feat/sprint-2-fase0` → PR → QA usuario → merge a main
2. `feat/sprint-3` → PR → QA usuario → merge a main
3. Las dos ramas son independientes (archivos distintos, sin conflictos)

## Prompt para Claude al continuar

Pegá esto al iniciar la próxima sesión:

---

Continuamos el Sprint 3 del proyecto proyector-fin. Hacé pull de la rama feat/sprint-3, leé `.claude/s3-prompt.md` y el engram topic `sprint/s3-state`, y ejecutá el checklist de S3 completo delegando la implementación a subagentes según el protocolo de orquestación del proyecto. La rama feat/sprint-2-fase0 ya está lista para QA. No toques esa rama.
