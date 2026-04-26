# vitali-app — Contexto del Proyecto

## Descripción

Plataforma interna para Vitali Suites (empresa de senior living de lujo con proyectos en Chile, México y Colombia). La app centraliza todas las operaciones internas del equipo comercial: simulador/cotizador de departamentos, gestión de clientes, emisión de cotizaciones en PDF, administración de proyectos inmobiliarios, y en el futuro el CMS del sitio público vitalisuites.com.

**Sitio público**: vitalisuites.com (no es parte de este proyecto todavía)
**App interna**: app.vitalisuites.com (este proyecto — prioridad)
**Staging**: staging.vitalisuites.com

## Stack

- **Frontend**: Vue 3.5 + Vite 6 + Tailwind CSS v4 + shadcn-vue (reka-ui v2)
- **Estado**: Pinia v3 (Composition API style)
- **Router**: Vue Router 4
- **Validación**: Vee-Validate + Zod
- **Utilidades**: VueUse
- **Testing**: Vitest + Vue Test Utils
- **Linting**: @antfu/eslint-config
- **Backend**: Supabase (PostgreSQL 17 + Auth + Storage + Edge Functions en Deno)
- **Paquetes**: pnpm (monorepo con workspaces)

## Monorepo

```
vitali-app/
├── apps/
│   ├── app/          ← Vue SPA — prioridad actual
│   └── web/          ← Astro — sitio marketing (futuro sprint)
├── packages/
│   └── brand/        ← tokens de color, tipografías, logo compartido
├── supabase/         ← migraciones SQL + Edge Functions
├── .claude/          ← skills y settings del proyecto
├── .atl/             ← skill-registry SDD
└── pnpm-workspace.yaml
```

## Arquitectura Clave

- **Plataforma única con RBAC**: un solo login en app.vitalisuites.com. Los roles determinan los módulos visibles.
- **Cliente tonto**: el frontend NUNCA calcula. Solo hace CRUD de inputs y lee resultados de Edge Functions.
- **Lógica de cálculo en Edge Functions**: crédito francés, crédito inteligente, cálculo de cuotas del cotizador — todo en Deno, nunca en Vue.
- **RLS en todas las tablas**: desde el día 1, sin excepciones.
- **Permisos atómicos por módulo**: cada acción (leer, crear, editar, eliminar) es un permiso separado. Se agrupan en roles asignables a usuarios.

## Supabase — Proyectos

| Entorno | Proyecto | Ref | Uso |
|---------|---------|-----|-----|
| Dev | vitali-app-dev | `bwiozqzevpmxjnwsjeuj` | Desarrollo y staging |
| Prod | vitali-app | `cwbppfodpuknxqwrhoev` | Producción (main) |

**MCP configurado en `.claude/settings.json`** — dos servidores: `supabase-dev` y `supabase-prod`.
**Regla de hierro**: Claude solo usa `supabase-dev` por defecto. Para tocar prod, el usuario debe escribir explícitamente "aplicar a prod".

## Entornos y Despliegue

| Rama git | Supabase | Frontend | Trigger deploy |
|---------|----------|----------|---------------|
| `feat/*` | **local** (`supabase start`) | no se despliega | — |
| `qa` | dev cloud | staging.vitalisuites.com | push a qa |
| `main` | prod cloud | app.vitalisuites.com | push a main |

Deploy via **GitHub Actions + SFTP** al hosting compartido. Credenciales en GitHub Secrets.

**Regla de Supabase local**: en `feat/*` el frontend SIEMPRE conecta al Supabase local. El `.env.local` apunta a `127.0.0.1:54321`. Nunca commitear `.env.local`. Las migraciones se aplican a supabase-dev recién al hacer merge a `qa`.

Setup en máquina nueva: `supabase start && supabase db reset` — ver `docs/S2-PLAN.md` para workflow completo.

## Identidad de Marca

- **Vitali Blue**: `#002B5B` — fondos, headers
- **Vitali Gold**: `#D4BE77` — CTAs, acentos
- **Heading**: Raleway (Google Fonts)
- **Body**: Lato (Google Fonts)
- **Logo**: `assets/logo_vitalisuites_blanco.webp` (sobre fondo azul)
- **UI**: bordes redondeados full (`rounded-full`), sombras suaves, espaciado amplio, minimalismo

## Reglas de Desarrollo

- `<script setup lang="ts">` siempre — nunca Options API
- Conventional Commits en español: `feat(scope): descripción`
- **NO buildear** después de cambios — el usuario lo hace
- Ramas: `feat/*` (local) → `qa` (staging) → `main` (producción)
- Un commit = un cambio lógico completo

## Checklist pre-commit (OBLIGATORIO — en este orden)

```
1. pnpm typecheck   → sin errores de tipos
2. pnpm lint        → sin errores de estilo
3. pnpm test:run    → todos los tests en verde
4. Revisión de calidad del código modificado:
   □ Funciones atómicas (una responsabilidad)
   □ Sin ifs anidados (early returns)
   □ Sin OR-chains > 3 condiciones (extraer predicados)
   □ Sin lógica duplicada
   □ Comentarios donde el WHY no es obvio
   □ Sin `any` o `as X` sin justificación
   □ Sin inputs de usuario sin validar
   □ Sin v-html con contenido dinámico
```

El paso 4 es manual — Claude lo hace mentalmente antes de cada commit.
Si algún punto falla, corregir antes de commitear.

## Calidad de Código — Estándares

- **Funciones atómicas**: una función, una responsabilidad. Si una función hace dos cosas, separarla.
- **Sin OR chains largas**: más de 3 condiciones `||` en un `if` o `.filter()` → extraer predicados con nombre.
- **Sin if anidados**: usar early returns y guard clauses.
- **Sin lógica duplicada**: si la misma secuencia aparece dos veces, extraerla a un helper.
- **Comentarios humanos**: escribir el *por qué*, no el *qué*. Usar ejemplos concretos (`12345678-5 → 12.345.678-5`). Sin comentarios de trámite ("This function does X").
- **Comentarios obligatorios cuando**: hay un algoritmo no obvio, una exclusión mágica, una workaround de librería, o una decisión que sorprendería a otro developer.

## TDD — Reglas de Hierro

**Strict TDD Mode: ENABLED — sin excepciones.**

El orden es SIEMPRE: test rojo → implementación → test verde. Nunca al revés.

### Qué SIEMPRE tiene tests

- Edge Functions (toda la lógica de negocio)
- Stores Pinia con lógica (no CRUD puro)
- Composables con comportamiento
- Funciones puras en `lib/` (filtros, formateo, validación, cálculos)
- Permisos y guards

### Qué NO necesita tests

- Componentes puramente presentacionales (solo markup + props)
- CRUD simple sin lógica condicional
- Datos estáticos (listas, constantes)

### Regla de extracción obligatoria

Si hay lógica verificable dentro de un componente Vue (computed compleja, transformaciones, filtros), se extrae a una función pura en `lib/` **antes** de escribir el componente. La función se testea. El componente la llama.

**Ejemplo correcto**: `filterClients(clients, query)` en `lib/clients-filter.ts` con 20 tests → `ClientsView.vue` la llama en un computed de una línea.

**Ejemplo incorrecto**: lógica de filtro directamente en el computed del componente, sin tests.

### Auto-check después de cada tarea

Antes de dar la tarea por terminada, responder: "¿Agregué comportamiento verificable sin un test correspondiente?" Si la respuesta es sí → escribir el test antes de hacer commit.

## Subagentes — Gestión Eficiente de Contexto

El contexto del agente principal es un recurso limitado. Usarlo para exploración o ejecución larga lo degrada para las decisiones importantes.

### Cuándo SIEMPRE delegar a subagente

| Situación | Acción |
|-----------|--------|
| Explorar más de 3 archivos para entender algo | `Agent(subagent_type=Explore)` |
| Ejecutar tests, builds o linters como tarea principal | Delegar |
| Implementar cambios en múltiples archivos con lógica nueva | Delegar |
| Investigar un bug que requiere rastrear varias capas | `Agent(subagent_type=Explore)` |

### Cuándo resolver inline

- Leer 1-3 archivos para tomar una decisión
- Editar un archivo mecánico (ya sé exactamente qué cambiar)
- Comandos git de estado (`git status`, `git log`)
- Responder preguntas conceptuales

## Memoria Persistente — Engram

Este proyecto usa Engram para memoria persistente entre sesiones.

### PRIMERA ACCIÓN al abrir este proyecto

1. Llamar `mem_context` para ver historial reciente
2. Llamar `mem_search` con keywords del tema antes de empezar cualquier tarea

### Topic keys principales

| Topic | Contenido |
|-------|-----------|
| `sdd-init/vitali-app` | Contexto arquitectural completo |
| `sdd/vitali-app/testing-capabilities` | Capacidades de testing |
| `skill-registry` (project: vitali-app) | Registry de skills |
| `sdd/{change}/proposal` | Propuesta de cada change |
| `sdd/{change}/spec` | Specs de cada change |
| `sdd/{change}/tasks` | Tareas de cada change |

## Patrones conocidos

### AlertDialog con reka-ui v2 — patrón correcto

**Problema**: `AlertDialogAction` emite `update:open = false` de forma SÍNCRONA antes de propagar el `@click` al padre. Si el AlertDialog tiene `@update:open="(v) => { if (!v) pendingXxx = null }"`, ese handler nulifica el ref ANTES de que `confirmXxx()` lo lea.

**Patrón correcto** — sin `@update:open`, cierre controlado por el handler:

```html
<!-- SIN @update:open -->
<AlertDialog :open="!!pendingXxx">
  ...
  <AlertDialogCancel @click="pendingXxx = null">Cancelar</AlertDialogCancel>
  <AlertDialogAction :disabled="..." @click="confirmXxx">Confirmar</AlertDialogAction>
```

```typescript
async function confirmXxx() {
  const item = pendingXxx.value   // capturar antes del await
  if (!item) return               // guardia sobre la variable local
  try {
    await store.action(item.id)
    toast.success(...)
  }
  catch (e: unknown) {
    toast.error(...)
  }
  finally {
    pendingXxx.value = null       // cierra el dialog siempre, éxito o error
  }
}
```

**Por qué funciona**: sin `@update:open`, reka-ui emite el cierre pero nadie lo escucha → el ref no cambia entre el click y el handler. El dialog se cierra solo cuando el `finally` nulifica el ref.

## Ver también

- `docs/REQUIREMENTS.md` — requerimientos de negocio completos
- `docs/ARCHITECTURE.md` — decisiones técnicas con justificación
- `docs/SPRINT-PLAN.md` — plan de sprints y alcance
- `brand_identity.md` — guía visual completa
- `.atl/skill-registry.md` — skills disponibles y compact rules
