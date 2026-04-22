# Documentación: Generación de Cotizaciones en PDF con Carbone.io

Este documento detalla el funcionamiento, los múltiples problemas resueltos y el flujo completo de la generación de archivos PDF (cotizaciones) utilizando **Supabase Edge Functions** y **Carbone API v4**.

## 1. Los Problemas Originales
Antes de llegar al flujo funcional, la Edge Function presentaba una cadena de errores HTTP 500 y problemas de permisos. Los bloqueos principales fueron:

1. **Problemas de Permisos (RLS) en Storage:**
   La Edge Function estaba intentando descargar la plantilla de diseño (`cotizacion.docx`) desde el bucket `templates` y luego subir el resultado al bucket `quotes` utilizando el cliente autenticado del usuario. Esto fallaba por las políticas de seguridad (Row Level Security - RLS) que bloqueaban el acceso a los archivos.
2. **Incompatibilidad con Carbone API v4:**
   El código original intentaba enviar el archivo Word codificado en formato `base64` dentro de un payload JSON. La versión 4 de la API de Carbone rechaza este formato devolviendo el error *"template field is empty"*.
3. **Plantilla Corrupta:**
   Una vez superados los problemas de autenticación y conexión, surgió el error `Template descargado está vacío (0 bytes)`. El archivo `cotizacion.docx` alojado en el bucket `templates` estaba corrupto/vacío, impidiendo que Carbone generara el PDF final.

## 2. La Solución Integral
Para estabilizar todo el proceso, se aplicaron las siguientes soluciones escalonadas:

1. **Uso de Service Role Key (Bypass de RLS):**
   Se modificó el código de la función (`supabase/functions/generate-pdf/index.ts`) para inicializar un cliente de Supabase dedicado al manejo de archivos usando `SUPABASE_SERVICE_ROLE_KEY`. Esto permite que el backend descargue la plantilla, suba el PDF resultante y genere la URL firmada sin ser bloqueado por las políticas de Storage de usuarios regulares. *(Nota: La seguridad de los datos de la cotización sí se mantiene con el token del usuario).*
2. **Adaptación a Carbone v4 (Multipart/form-data):**
   Se reescribió la lógica de subida a la API de Carbone. En lugar de base64, ahora la función ensambla un objeto `FormData` y envía la plantilla temporal a Carbone (`POST /template`) como un archivo nativo. Luego, toma el `templateId` retornado para mezclar los datos y generar el PDF.
3. **Generación de Plantilla Mínima Viable:** 
   Se desarrolló un script en Python (`scripts/build_cotizacion_template.py`) que genera programáticamente un archivo `.docx` mínimo y válido, incluyendo los "placeholders" de Carbone requeridos (ej. `{d.cliente.nombre}`).
4. **Reemplazo en el Storage:**
   Se eliminó la plantilla corrupta de 0 bytes y se subió la plantilla de prueba funcional usando la CLI:
   ```bash
   supabase --experimental storage rm --yes ss:///templates/cotizacion.docx
   supabase --experimental storage cp scripts/cotizacion.docx ss:///templates/cotizacion.docx
   ```
5. **Configuración de Autenticación de la Edge Function (`config.toml`):**
   Para evitar que el Engine de Supabase bloquée peticiones por problemas de cabeceras, se añadió `verify_jwt = false` al bloque `[functions.generate-pdf]`. La validación de seguridad de quién llama a la función se sigue ejecutando, pero **internamente** dentro del código TypeScript mediante `supabase.auth.getUser()`.
6. **Protección del Repositorio:**
   Se agregó `scripts/*.docx` al `.gitignore` para no trackear plantillas temporales.

## 3. Flujo Actual (End-to-End)
Para que cualquier desarrollador entienda exactamente cómo funciona el botón en el frontend y el backend, este es el recorrido de los datos:

### Fase 1: En la Interfaz de Usuario (Frontend)
1. El usuario crea una cotización. En la BD, esta cotización no tiene ningún archivo asignado, por lo que su columna `pdf_path` es `null`.
2. La interfaz de Vue.js detecta que el `pdf_path` está vacío y muestra un botón que dice **"Generar PDF"**.
3. El usuario hace clic en **"Generar PDF"**. Esto dispara una petición HTTP POST a la Edge Function `generate-pdf`, enviándole el `quote_id`.

### Fase 2: En la Edge Function (Backend)
4. **Validación:** La función extrae el token del usuario y verifica internamente (`auth.getUser()`) que la petición sea legítima.
5. **Recopilación de Datos:** Hace una consulta a la BD para extraer todos los datos de esa cotización (cliente, proyecto, torre, unidad, finanzas). Como usa el token del cliente, las reglas RLS de la tabla `quotes` lo protegen.
6. **Descarga de Plantilla (Service Role):** Se usa el Service Role para conectarse a Supabase Storage y descargar a la memoria la plantilla `cotizacion.docx` desde el bucket `templates`, evadiendo bloqueos de RLS en storage.
7. **Procesamiento en Carbone v4:**
   - La función envía la plantilla descargada a Carbone.io vía `FormData`.
   - Carbone devuelve un `templateId`.
   - La función envía los datos de la cotización (`JSON`) a Carbone apuntando a ese `templateId`.
   - Carbone inyecta la información y devuelve un archivo **PDF** generado.
8. **Almacenamiento Permanente (Service Role):** La Edge Function guarda ese PDF resultante en Supabase Storage dentro del bucket `quotes`, bajo el nombre `<quote_id>.pdf`.
9. **Actualización BD (Service Role):** La función actualiza la fila de la cotización en la BD, guardando el string `<quote_id>.pdf` en la columna `pdf_path`.
10. **Respuesta:** Genera una "URL Firmada" (temporal válida por 1 hora) y se la devuelve al frontend.

### Fase 3: De vuelta en la Interfaz (Frontend)
11. El frontend recibe la URL, la abre en una nueva pestaña (o la descarga).
12. Automáticamente, la UI detecta que ahora `quote.pdf_path` ya no está vacío.
13. El botón cambia su texto a **"Descargar PDF"**.

### Caching Integrado
Si el usuario hace clic nuevamente en "Descargar PDF", el sistema ya **NO ejecuta los pasos del 3 al 10**. Simplemente genera una URL firmada directa al archivo que ya está guardado en Storage y lo descarga en milisegundos.
Esto ahorra cuota de uso en la API de Carbone, tiempo de carga para el usuario y asegura inmutabilidad (el archivo entregado no cambia con el tiempo).

## Siguientes Pasos
El flujo está al 100% operativo. El paso final para producción es sustituir la plantilla de prueba en el bucket `templates` por el documento **Word real** de la empresa, manteniendo las variables lógicas de Carbone.
