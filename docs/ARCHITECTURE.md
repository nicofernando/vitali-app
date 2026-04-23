# Arquitectura Técnica — vitali-app

## Decisiones de Arquitectura

### ADR-001: Plataforma única con RBAC vs apps separadas
**Decisión**: Una sola SPA en `app.vitalisuites.com` con roles y permisos que determinan los módulos visibles.
**Por qué**: Un solo login, auth centralizado en Supabase, sin problemas de token sharing entre apps. Los módulos (cotizador, CMS, admin) son funcionalidades del mismo sistema, no productos distintos. Separar en apps distintas solo se justifica con equipos de 50+ personas o SLAs radicalmente distintos.
**Consecuencia**: Todo crece en el mismo proyecto. La navegación es dinámica según permisos.

### ADR-002: Frontend como cliente tonto
**Decisión**: El frontend NUNCA realiza cálculos financieros. Solo hace CRUD de inputs y lee resultados.
**Por qué**: Consistencia matemática garantizada, fácil testing de la lógica de negocio, el frontend puede cambiar sin afectar los cálculos, auditable.
**Consecuencia**: Todas las fórmulas del cotizador (crédito francés, crédito inteligente) viven en Edge Functions de Supabase.

### ADR-003: Monorepo con pnpm workspaces
**Decisión**: Un solo repo con `apps/app` (Vue SPA) y `apps/web` (Astro, futuro), más `packages/brand`.
**Por qué**: Comparten branding, assets, y eventualmente tipos TypeScript. Un solo `supabase/` para migraciones y edge functions.
**Consecuencia**: `pnpm-workspace.yaml` en la raíz. `supabase/` también en la raíz.

### ADR-004: Supabase como backend completo
**Decisión**: PostgreSQL + Auth + Storage + Edge Functions, todo en Supabase.
**Por qué**: Sin servidor propio que mantener, gratis en tier inicial, escalable. Auth integrado con RLS. Edge Functions en Deno para lógica de negocio.
**Consecuencia**: No hay backend custom. Si Supabase tiene downtime, la app no funciona. Mitigación: monitoreo básico, plan Pro cuando el negocio lo justifique.

### ADR-005: Dos entornos Supabase (dev y prod)
**Decisión**: `vitali-app-dev` para desarrollo y staging. `vitali-app` para producción.
**Por qué**: Supabase free tier da 2 proyectos. Protege prod de cambios en desarrollo. Claude solo tiene MCP activo hacia dev por defecto.
**Consecuencia**: Los datos de dev pueden diferir de prod. Las migraciones se aplican primero en dev, luego manualmente en prod al cerrar sprint.

### ADR-006: Deploy via GitHub Actions + SFTP
**Decisión**: No usar Cloudflare Pages/Netlify — el frontend va al hosting compartido existente.
**Por qué**: El cliente ya tiene el hosting. Para una SPA compilada (solo archivos estáticos), un hosting compartido con SFTP es perfectamente válido. No hay credenciales sensibles en el bundle compilado.
**Consecuencia**: GitHub Actions automatiza el build y el upload SFTP. Credenciales en GitHub Secrets. El Supabase anon key queda en el bundle (es por diseño — RLS protege los datos).

### ADR-007: PDF generado server-side con Carbone.io + templates .docx
**Decisión**: Las cotizaciones y documentos PDF se generan en Edge Functions de Supabase usando Carbone.io con plantillas `.docx` de Word.
**Por qué**: Output profesional controlado por el cliente sin tocar código. El template es un `.docx` editable en Word con variables `{d.campo}`. Alternativas descartadas: jsPDF + html2canvas (mala calidad), Chrome headless/PDFShift (overhead de infra). Carbone cloud free tier es suficiente para el volumen actual (100 renders/mes); cuando escale → Carbone OSS self-hosted en Docker con la misma API.
**Consecuencia**: Flujo en 3 pasos via API REST (upload template → render con datos → download PDF). Templates viven en Supabase Storage bucket `templates`. `verify_jwt = false` en `config.toml` es obligatorio — la validación del token se hace internamente en la Edge Function via `auth.getUser()`. Ver `DOCS_CARBONE_PDF_GENERATION.md` para el flujo completo y deuda técnica.

### ADR-008: Credenciales SMTP en Supabase Vault
**Decisión**: Las passwords SMTP de cada vendedor se almacenan cifradas en Supabase Vault.
**Por qué**: No se pueden almacenar en texto plano en la DB. Vault cifra con AES-256 y el frontend nunca accede a estos valores — solo la Edge Function los lee en runtime.
**Consecuencia**: La Edge Function de email necesita permisos para leer del Vault. Si un vendedor cambia su contraseña de email, debe actualizarla en su perfil.

### ADR-009: Imágenes CMS procesadas client-side (MVP)
**Decisión**: Antes de subir al Storage de Supabase, procesar la imagen en el browser con `browser-image-compression`: convertir a WebP, comprimir, limitar dimensiones.
**Por qué**: Funciona en Supabase free tier. Simple: un composable `useImageUpload()`. No requiere infraestructura adicional.
**Consecuencia**: No genera variantes responsivas múltiples (1200w, 800w, 400w). Eso se agrega cuando pasen a plan Pro con Edge Functions + Sharp.

### ADR-010: Estrategia de ramas
**Decisión**: `feat/*` (local) → `qa` → `main`. Borrar ramas de feature después del merge.
**Por qué**: `qa` es el staging real que se despliega a `staging.vitalisuites.com`. `main` es producción. Borrar ramas después del merge mantiene el repo limpio — los commits no se pierden, siguen en el historial.
**Consecuencia**: Dos workflows de GitHub Actions: `deploy-staging.yml` (push a qa) y `deploy-prod.yml` (push a main).

---

## Modelo de Datos (borrador — Sprint 1)

```sql
-- Monedas del sistema
currencies (id, code, name, symbol)

-- Proyectos inmobiliarios
projects (id, name, description, location, currency_id, annual_interest_rate,
          french_credit_enabled, smart_credit_enabled, created_at)

-- Torres / Bloques
towers (id, project_id, name, description, delivery_date,
        max_financing_years, min_pie_percentage, created_at)

-- Tipologías de departamentos
typologies (id, name, surface_m2, description, created_at)

-- Asignación de tipologías a proyectos
project_typologies (project_id, typology_id)

-- Departamentos
units (id, tower_id, typology_id, unit_number, floor, list_price, created_at)

-- Roles
roles (id, name, description, created_at)

-- Permisos
permissions (id, module, action, description)
-- Ejemplo: { module: 'projects', action: 'create' }

-- Permisos por rol
role_permissions (role_id, permission_id)

-- Usuarios (extiende auth.users de Supabase)
user_profiles (id, user_id, full_name, email, phone, is_active,
               smtp_host, smtp_port, smtp_user, created_at)
-- smtp_password → en Supabase Vault, referenciado por user_id

-- Roles de usuarios
user_roles (user_id, role_id)

-- Clientes
clients (id, full_name, rut, address, commune, phone, email,
         created_by, created_at)

-- Cotizaciones
quotes (id, client_id, unit_id, pie_percentage, pie_amount,
        financing_amount, credit_type, term_years, monthly_rate,
        monthly_payment, balloon_payment, quote_data_snapshot,
        pdf_path, created_by, created_at)
-- quote_data_snapshot: JSON con todos los datos al momento de cotizar
```

---

## Estructura de la App Vue (apps/app/src/)

```
src/
├── assets/           ← logo, fuentes, imágenes estáticas
├── components/
│   ├── ui/           ← shadcn-vue base components
│   ├── layout/       ← AppShell, Sidebar, TopBar
│   ├── projects/     ← componentes del módulo proyectos
│   ├── towers/       ← componentes del módulo torres
│   ├── units/        ← componentes del módulo deptos
│   ├── typologies/   ← componentes del módulo tipologías
│   ├── simulator/    ← componentes del cotizador
│   ├── quotes/       ← componentes de cotizaciones
│   └── clients/      ← componentes de clientes
├── composables/
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   └── useImageUpload.ts (futuro CMS)
├── router/
│   └── index.ts      ← rutas con guards de permiso
├── stores/
│   ├── auth.ts
│   ├── projects.ts
│   ├── towers.ts
│   ├── units.ts
│   ├── typologies.ts
│   ├── simulator.ts
│   ├── quotes.ts
│   └── clients.ts
├── views/
│   ├── auth/         ← LoginView
│   ├── projects/     ← ProjectsView, ProjectDetailView
│   ├── simulator/    ← SimulatorView
│   ├── quotes/       ← QuotesView, QuoteDetailView
│   └── clients/      ← ClientsView
└── lib/
    └── supabase.ts   ← cliente Supabase
```

---

## Edge Functions (supabase/functions/)

```
supabase/functions/
├── calculate-quote/     ← cálculo crédito francés + inteligente
├── generate-pdf/        ← genera PDF de cotización
└── send-quote-email/    ← envía email con PDF adjunto (Sprint 3)
```

---

## GitHub Actions (futuro)

```
.github/workflows/
├── deploy-staging.yml   ← push a qa → build → SFTP a staging.vitalisuites.com
└── deploy-prod.yml      ← push a main → build → SFTP a app.vitalisuites.com
```

### Secrets necesarios en GitHub
```
STAGING_FTP_HOST
STAGING_FTP_USER
STAGING_FTP_PASS
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY

PROD_FTP_HOST
PROD_FTP_USER
PROD_FTP_PASS
PROD_SUPABASE_URL
PROD_SUPABASE_ANON_KEY
```
