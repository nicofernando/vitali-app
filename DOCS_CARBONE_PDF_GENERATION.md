# Documentación: Generación de Cotizaciones en PDF con Carbone.io

Este documento detalla el funcionamiento, los problemas resueltos y el flujo completo de la generación de archivos PDF (cotizaciones) utilizando **Supabase Edge Functions** y **Carbone API v4**.

## 1. El Problema Original
Al intentar generar una cotización en formato PDF, la función devolvía un error HTTP 500 (Internal Server Error) en la consola y la UI fallaba con el mensaje: `Template descargado está vacío (0 bytes)`.

### Causa raíz:
El archivo de origen `cotizacion.docx` alojado en el bucket de Supabase Storage (`templates`) estaba corrupto y tenía un tamaño de exactamente `0 bytes`. Al descargar un archivo vacío, la Edge Function no podía enviarle una plantilla válida a Carbone, por lo que el proceso fallaba antes de la generación.

## 2. La Solución
Se ejecutaron los siguientes pasos para restaurar la funcionalidad del flujo:

1. **Generación de Plantilla Mínima Viable:** 
   Se desarrolló un script en Python (`scripts/build_cotizacion_template.py`) que genera programáticamente un archivo `.docx` mínimo y válido, incluyendo los "placeholders" de Carbone requeridos (ej. `{d.cliente.nombre}`, `{d.proyecto.nombre}`).
2. **Reemplazo en el Storage:**
   Usando la CLI de Supabase, se eliminó la plantilla corrupta y se subió la nueva plantilla funcional al bucket `templates`:
   ```bash
   supabase --experimental storage rm --yes ss:///templates/cotizacion.docx
   supabase --experimental storage cp scripts/cotizacion.docx ss:///templates/cotizacion.docx
   ```
3. **Validación de la Función y API de Carbone:**
   La Edge Function (`supabase/functions/generate-pdf/index.ts`) fue testeada internamente. Se confirmó que:
   - Extrae los datos desde la BD usando RLS (Row Level Security).
   - Usa `multipart/form-data` para subir el archivo `.docx` a la API v4 de Carbone (que es el formato requerido en la versión 4).
   - Realiza la solicitud POST al endpoint `/render/{templateId}`.
   - Extrae correctamente el binario del PDF generado.
4. **Actualización de Configuraciones (`config.toml` y `.gitignore`):**
   - Se añadió `verify_jwt = false` al bloque `[functions.generate-pdf]` en el archivo `supabase/config.toml` para evitar validaciones dobles de JWT en la capa de red (ya que la función valida la sesión internamente con `supabase.auth.getUser()`).
   - Se modificó `.gitignore` agregando la regla `scripts/*.docx` para evitar que la plantilla temporal se suba al repositorio Git accidentalmente.

## 3. Flujo Actual (End-to-End)
Para que cualquier desarrollador entienda exactamente cómo funciona el botón en el frontend y el backend, este es el recorrido de los datos:

### Fase 1: En la Interfaz de Usuario (Frontend)
1. El usuario crea una cotización. En la BD, esta cotización no tiene ningún archivo asignado, por lo que su columna `pdf_path` es `null`.
2. La interfaz de Vue.js detecta que el `pdf_path` está vacío y muestra un botón que dice **"Generar PDF"**.
3. El usuario hace clic en **"Generar PDF"**. Esto dispara una petición HTTP POST a la Edge Function `generate-pdf`, enviándole el `quote_id`.

### Fase 2: En la Edge Function (Backend)
4. **Validación:** La función extrae el token del usuario y verifica que sea válido.
5. **Recopilación de Datos:** Hace una consulta a la BD para extraer todos los datos de esa cotización (cliente, proyecto, torre, unidad, finanzas).
6. **Descarga de Plantilla:** Se conecta a Supabase Storage y descarga a la memoria la plantilla madre `cotizacion.docx` desde el bucket `templates`.
7. **Procesamiento en Carbone:**
   - La función envía la plantilla descargada a Carbone.io (vía `FormData`).
   - Carbone devuelve un `templateId`.
   - La función envía todos los datos recopilados de la cotización a Carbone apuntando a ese `templateId`.
   - Carbone inyecta la información, reemplaza las variables y le devuelve a la Edge Function un archivo en formato **PDF**.
8. **Almacenamiento Permanente:** La Edge Function guarda ese PDF resultante en Supabase Storage dentro del bucket `quotes`, bajo el nombre `<quote_id>.pdf`.
9. **Actualización BD:** La función actualiza la fila de la cotización en la BD, guardando el string `<quote_id>.pdf` en la columna `pdf_path`.
10. **Respuesta:** La función crea una "URL Firmada" (Signed URL temporal válida por 1 hora) y se la devuelve al frontend.

### Fase 3: De vuelta en la Interfaz (Frontend)
11. El frontend recibe la URL, la abre en una nueva pestaña (o la descarga) para el usuario.
12. Automáticamente, la UI detecta que ahora `quote.pdf_path` ya no está vacío.
13. El botón cambia su texto mágicamente a **"Descargar PDF"**.

### Caching Integrado
Si el usuario hace clic nuevamente en "Descargar PDF", el sistema ya **NO ejecuta los pasos del 3 al 10**. Simplemente genera una URL firmada directa al archivo que ya está guardado en Storage y lo descarga en milisegundos.
Esto ahorra cuota de uso en la API de Carbone, tiempo de carga para el usuario y asegura inmutabilidad (el archivo entregado no cambia con el tiempo).

## Siguientes Pasos
El flujo está al 100% operativo. El único paso restante para producción es:
- **Sustituir la plantilla de prueba** en el bucket `templates` (usando el Supabase Dashboard o tu aplicación web si tiene la interfaz para ello) por el documento **Word real y diseñado de tu empresa**, asegurándote de que tenga configuradas las mismas variables lógicas de Carbone (ej: `{d.cliente.nombre}`).
