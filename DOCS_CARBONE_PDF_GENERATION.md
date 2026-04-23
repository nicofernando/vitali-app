# Documentación: Generación de Cotizaciones en PDF con Carbone.io

Este documento detalla el funcionamiento, los problemas resueltos y el flujo completo de la generación de archivos PDF (cotizaciones) utilizando **Supabase Edge Functions** y **Carbone API v4**.

## 1. Los Problemas Originales

Antes de llegar al flujo funcional, la Edge Function presentaba una cadena de errores HTTP 500 y problemas de permisos. Los bloqueos principales fueron:

1. **Problemas de Permisos (RLS) en Storage:**
   La Edge Function intentaba descargar la plantilla y subir el resultado usando el cliente autenticado del usuario. Esto fallaba por las políticas RLS que bloqueaban el acceso a los buckets.
2. **Incompatibilidad con Carbone API v4:**
   El código original enviaba el archivo Word codificado en `base64` dentro de un payload JSON. La versión 4 de Carbone rechaza este formato devolviendo el error *"template field is empty"*.
3. **Plantilla Corrupta:**
   Una vez resueltos los problemas de autenticación, surgió `Template descargado está vacío (0 bytes)`. El archivo `cotizacion.docx` en el bucket `templates` estaba corrupto/vacío.

## 2. La Solución Integral

1. **Uso de Service Role Key (Bypass de RLS):**
   La función usa un segundo cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY` para operaciones de storage (descarga de template, subida de PDF, URL firmada) y para el UPDATE de `pdf_path`. La autenticación del usuario sigue validándose con su token real.

2. **Adaptación a Carbone v4 (flujo en 3 pasos via multipart/form-data):**
   - **Paso 1**: `POST /template` con `FormData` → Carbone devuelve `templateId`
   - **Paso 2**: `POST /render/{templateId}` con JSON de datos → Carbone devuelve `renderId`
   - **Paso 3**: `GET /render/{renderId}` → descarga del PDF binario (`application/pdf`)
   
   > **Nota importante**: El formato base64 en JSON fue el approach original — falla en v4. El formato correcto es `FormData` con el archivo adjunto como `Blob`.

3. **Generación de Plantilla Mínima Viable:**
   Script Python (`scripts/build_cotizacion_template.py`) genera un `.docx` mínimo y válido con los placeholders Carbone requeridos (ej. `{d.cliente.nombre}`).

4. **`verify_jwt = false` en config.toml:**
   El Supabase Engine valida el JWT antes de llamar a la función. `verify_jwt = false` deshabilita esa validación externa. La autenticación **sigue ejecutándose internamente** en el código TypeScript mediante `supabase.auth.getUser()`. Este flag es obligatorio porque el Engine bloqueaba las requests por problemas de cabeceras.
   > **Seguridad**: Si se elimina el `auth.getUser()` interno, la función quedaría abierta. No remover sin reemplazarlo.

5. **Protección del Repositorio:**
   `scripts/*.docx` agregado al `.gitignore`.

## 3. Flujo Actual (End-to-End)

### Fase 1: Frontend (Vue.js)
1. El usuario crea una cotización. `pdf_path` queda `null` en BD.
2. La UI muestra botón **"Generar PDF"**.
3. El usuario hace clic → `POST` a Edge Function `generate-pdf` con `{ quote_id }`.

### Fase 2: Edge Function (Backend)
4. **Validación interna**: `auth.getUser()` verifica el token del usuario.
5. **Fetch de datos**: SELECT a `quotes` con todos los joins. El RLS garantiza que solo el owner o admins con `quotes.read_all` puedan acceder.
6. **Descarga de template** (Service Role): `storage.from('templates').download('cotizacion.docx')`.
7. **Procesamiento Carbone v4** (3 pasos): upload template → render con datos → descarga PDF.
8. **Subida a Storage** (Service Role): `storage.from('quotes').upload(quote_id + '.pdf', pdfBytes)`.
9. **UPDATE `pdf_path`** (Service Role): actualiza la fila en `quotes`. Se usa service role porque admins generan PDFs de cotizaciones ajenas.
10. **URL firmada** (Service Role): `createSignedUrl` válida 1 hora.

### Fase 3: Frontend (respuesta)
11. La UI recibe la URL firmada y la abre en nueva pestaña.
12. El botón pasa de "Generar PDF" a "Descargar PDF" (detect `pdf_path` no nulo).

### Caching integrado
Si `pdf_path` ya tiene valor, el frontend NO llama a la Edge Function — genera directamente una nueva URL firmada al archivo existente. Esto ahorra cuota Carbone y garantiza inmutabilidad del PDF entregado.

## 4. Deuda Técnica

| # | Descripción | Impacto | Sprint |
|---|-------------|---------|--------|
| DT-1 | **Subida redundante del template a Carbone**: cada render sube el `.docx` de nuevo. Agregar latencia innecesaria (~500ms) | Performance | S3 |
| DT-2 | **Nombre de template hardcodeado** (`TEMPLATE_NAME = 'cotizacion.docx'` en `index.ts`): limita pero no bloquea — es una constante. Desacoplar al agregar multi-documentos | Escalabilidad | S3 |
| DT-3 | **RLS bypass en UPDATE de `pdf_path`**: se usa service role en lugar del cliente de usuario. `auth.uid()` no queda registrado para ese UPDATE si hubiera triggers que dependan de él | Trazabilidad | S3 |

> La solución ideal para DT-1 y DT-2 es una tabla `document_templates` con `carbone_template_id` cacheado. Esto está planificado para S3 junto con la UI de gestión de templates.

## 5. Próximos Pasos (S3)

- Reemplazar la plantilla mínima de prueba por el **Word corporativo real** de Vitali Suites (requiere diseño del cliente).
- UI de gestión de templates en `/settings` (tab Documentos) para subir nuevas versiones.
- Cachear `templateId` de Carbone en BD para eliminar el upload redundante (DT-1).
- Soporte para múltiples tipos de documento (contrato, NDA, proforma) — arquitectura en `document-variables.ts` ya preparada.
