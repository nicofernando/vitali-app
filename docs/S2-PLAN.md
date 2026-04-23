# S2 — Cotización en PDF

## Objetivo

Cerrar el ciclo del cotizador: vendedor calcula → guarda con datos del cliente → se genera PDF con template corporativo → descarga → queda en historial.

## Rama de desarrollo

`feat/s2` — NO mergear a `qa` hasta que S2 esté completo y probado localmente.

## Supabase — Estrategia de entornos

| Rama | Supabase | Frontend desplegado |
|------|----------|---------------------|
| `feat/*` | **local** (`127.0.0.1:54321`) | Solo local (`pnpm dev`) |
| `qa` | dev cloud (`bwiozqzevpmxjnwsjeuj`) | staging.vitalisuites.com |
| `main` | prod cloud (`cwbppfodpuknxqwrhoev`) | app.vitalisuites.com |

### Setup inicial (una vez por máquina)

```bash
# 1. Instalar Supabase CLI (ya está en ~/.local/bin en la máquina de desarrollo)
# Si es una máquina nueva, descargar desde: https://github.com/supabase/cli/releases

# 2. Levantar Supabase local (desde la raíz del monorepo)
supabase start

# 3. Copiar las keys que muestra en pantalla al .env.local
# apps/app/.env.local ya tiene el formato correcto — actualizar con las keys de `supabase status`

# 4. Aplicar migraciones
supabase db reset
```

### Workflow diario

```bash
supabase start        # al empezar (si no está corriendo)
pnpm dev              # el frontend conecta al Supabase local automáticamente
supabase db reset     # si agregaste migraciones nuevas o querés estado limpio
supabase stop         # al terminar el día (opcional)
```

### Reglas de migraciones

- Las migraciones se desarrollan y prueban en local (`feat/*`)
- **NO se aplican a supabase-dev** hasta hacer merge a `qa`
- Al mergear `feat/s2` → `qa`: CI aplica las migraciones a supabase-dev automáticamente
- Al mergear `qa` → `main`: CI aplica las migraciones a supabase-prod

**Las migraciones SIEMPRE son aditivas** — nunca DROP de columnas o tablas en uso, nunca RENAME directo. Si hay que renombrar: ADD nueva columna → migrar datos → DROP vieja (en migraciones separadas).

## Arquitectura de generación de documentos

### Motor de templates: Carbone.io

- **MVP**: Carbone cloud API (free tier, 100 renders/mes)
- **Cuando escale**: migrar a Carbone OSS self-hosted en Docker (Railway/Fly)
- La migración es transparente — mismo formato de API

### Flujo de generación

```
Vendedor confirma guardar
        ↓
quotesStore.create(payload)     → guarda en DB (quotes table)
        ↓
quotesStore.generatePdf(id)     → llama Edge Function generate-pdf
        ↓
Edge Function (Carbone v4 — flujo en 3 pasos):
  1. Fetch quote + joins desde DB (auth client — respeta RLS)
  2. Fetch template .docx desde Storage (service client — bypassa RLS)
  3. buildCarboneData() → objeto de variables para Carbone
  4. POST api.carbone.io/template (FormData) → templateId
  5. POST api.carbone.io/render/{templateId} (JSON data) → renderId
  6. GET  api.carbone.io/render/{renderId} → PDF binario
  7. Upload PDF a Storage (bucket: quotes/{quote_id}.pdf)
  8. UPDATE quotes SET pdf_path = path
  9. createSignedUrl (válida 1h)
  10. Retorna { url, pdf_path, expires_at }
        ↓
Frontend abre URL en nueva pestaña → PDF descargado
```

> **Importante**: Carbone v4 rechaza templates en base64 dentro de JSON ("template field is empty").
> El formato correcto es `FormData` con el archivo adjunto como `Blob`. Ver `DOCS_CARBONE_PDF_GENERATION.md`.

### Almacenamiento

| Bucket | Contenido | Acceso |
|--------|-----------|--------|
| `templates` | Archivos .docx con variables Carbone | SELECT: autenticados con `settings.read` |
| `quotes` | PDFs generados | SELECT: owner o `quotes.read_all` |

### Variables en los templates

Sintaxis Carbone en el .docx:
- Valor simple: `{d.cliente.nombre}`
- Objeto anidado: `{d.proyecto.moneda.symbol}`
- Tabla con N filas: fila con `{d.cuotas[i].fecha}`, `{d.cuotas[i].capital}`, etc.

El sistema genera la tabla de referencia de variables automáticamente desde `DATA_BLOCKS` (`apps/app/src/lib/document-variables.ts`).

### Tipos de documento en S2

Solo `cotizacion`. El sistema está preparado para S3 donde se agregan nuevos tipos con UI de configuración.

## Módulos nuevos

### Clientes (`/clients`)
- Permiso: `clients.read`
- CRUD completo + búsqueda en vivo por nombre/RUT (RPC `search_clients` con pg_trgm)

### Cotizaciones (`/quotes`)
- Permiso: `quotes.read`
- Listado del historial + descarga de PDF
- Vendedor ve las suyas, admin ve todas

### Configuración (`/settings`)
- Permiso: `settings.read`
- Tab "Documentos": subir nueva versión de template + ver tabla de variables

## Base de datos — Cambios en S2

**Migración**: `supabase/migrations/20260407000006_s2_schema_additions.sql`

Cambios en tablas existentes:
```sql
-- quotes: columnas faltantes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'sent', 'expired'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS smart_cuotas_percentage numeric(5,2);

-- Triggers automáticos de created_by
CREATE TRIGGER quotes_set_created_by ...
CREATE TRIGGER clients_set_created_by ...

-- Búsqueda difusa
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS clients_full_name_trgm_idx ON clients USING gin (full_name gin_trgm_ops);

-- RPCs nuevos
CREATE OR REPLACE FUNCTION search_clients(p_query text) ...
CREATE OR REPLACE FUNCTION get_quotes_with_details() ...
```

## Orden de implementación (TDD strict)

```
1.  Migración SQL → MCP supabase-dev apply_migration
2.  Crear buckets 'templates' + 'quotes' en dev (dashboard o MCP)
3.  Crear cotizacion.docx inicial con variables y subirlo a bucket templates
4.  Configurar CARBONE_API_KEY como secret del Edge Function en dev
5.  types/index.ts → Client, QuoteSummary, QuoteInsert, GeneratePdf*
6.  lib/document-variables.ts → DATA_BLOCKS, DOCUMENT_TYPE_BLOCKS
7.  stores/clients.test.ts → RED → clients.ts → GREEN
8.  stores/quotes.test.ts → RED → quotes.ts → GREEN
9.  functions/generate-pdf/builder.test.ts → RED → builder.ts → GREEN
10. functions/generate-pdf/fetcher.ts + index.ts
11. Deploy Edge Function generate-pdf en dev (MCP)
12. components/clients/ClientForm.vue
13. views/clients/ClientsView.vue
14. components/quotes/SaveQuoteDialog.vue
15. views/simulator/SimulatorView.vue (botón + dialog)
16. views/quotes/QuotesView.vue
17. views/settings/SettingsView.vue (tab Documentos)
18. router/index.ts + AppSidebar.vue
19. Smoke test manual end-to-end en local
```

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260407000006_s2_schema_additions.sql` | Columnas, triggers, RPCs |
| `apps/app/src/lib/document-variables.ts` | DATA_BLOCKS — fuente de verdad de variables |
| `apps/app/src/stores/clients.ts` + `clients.test.ts` | CRUD + búsqueda |
| `apps/app/src/stores/quotes.ts` + `quotes.test.ts` | Crear + listar + PDF |
| `apps/app/src/components/clients/ClientForm.vue` | Form reutilizable |
| `apps/app/src/components/quotes/SaveQuoteDialog.vue` | Dialog guardar desde simulador |
| `apps/app/src/views/clients/ClientsView.vue` | CRUD de clientes |
| `apps/app/src/views/quotes/QuotesView.vue` | Historial + descarga |
| `apps/app/src/views/settings/SettingsView.vue` | Templates + variables |
| `supabase/functions/generate-pdf/index.ts` | Handler Edge Function |
| `supabase/functions/generate-pdf/fetcher.ts` | Fetch datos DB |
| `supabase/functions/generate-pdf/builder.ts` | Objeto data para Carbone |
| `supabase/functions/generate-pdf/builder.test.ts` | Tests Deno del builder |

## Archivos a modificar

| Archivo | Qué cambia |
|---------|------------|
| `apps/app/src/types/index.ts` | + Client, QuoteSummary, QuoteInsert, GeneratePdf* |
| `apps/app/src/router/index.ts` | Rutas /clients, /quotes, /settings |
| `apps/app/src/components/layout/AppSidebar.vue` | Quitar comingSoon de Clientes, Cotizaciones, Configuración |
| `apps/app/src/views/simulator/SimulatorView.vue` | Botón "Guardar cotización" + SaveQuoteDialog |

## Decisiones técnicas

| Decisión | Justificación |
|----------|---------------|
| Carbone cloud → self-hosted cuando escale | Cero overhead de infra en MVP, migración transparente |
| Template como base64 en cada request | Sin gestión de templateId en Carbone — el .docx vive en Supabase Storage |
| `quote_data_snapshot` como source of truth | PDF siempre refleja lo que el vendedor vio al guardar, sin recalcular |
| Trigger `set_created_by` en DB | El frontend no necesita conocer el user.id, previene spoofing |
| URL firmada (1h) para descarga | Privacidad — no URLs públicas de cotizaciones |
| S3 para gestión de tipos de documento | `DATA_BLOCKS` anticipa la arquitectura sin bloquear el MVP |

## S3 — Lo que viene después

- UI para crear nuevos tipos de documento (contrato, anexo, etc.)
- Árbol de selección atómica de variables por tipo de documento
- Validación de template al subir (detecta variables inválidas)
- Preview con datos de prueba antes de publicar
- Migración a Carbone self-hosted si el volumen lo justifica
