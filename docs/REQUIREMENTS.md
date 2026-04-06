# Requerimientos — vitali-app

## Contexto de Negocio

Vitali Suites es un concepto de vida para adultos mayores que combina residencia de lujo con servicios premium (spa, restaurantes gourmet, enfermería, vigilancia 24/7). Tiene proyectos en Chile, México y Colombia. Oficinas en Santiago (Av La Dehesa 1500, Piso 4) y Miami.

El equipo comercial necesita una plataforma interna para operar: cotizar departamentos, gestionar clientes, emitir documentos y en el futuro administrar el contenido del sitio público.

---

## Módulo: Autenticación y Roles (Sprint 1)

### Autenticación
- Login con email + contraseña via Supabase Auth
- Sesión persistente con cookie de dominio `.vitalisuites.com` (para futura integración con sitio público)
- Sin registro público — los usuarios los crea un administrador

### Sistema de Roles y Permisos
- Permisos atómicos: cada acción es un permiso individual (ej: `projects.read`, `projects.create`, `projects.edit`, `projects.delete`)
- Los permisos se agrupan en **roles** (ej: "Vendedor", "Admin Inmobiliario", "Super Admin")
- Los roles se asignan a usuarios
- Un usuario puede tener múltiples roles
- RLS en Supabase hace cumplir los permisos a nivel de base de datos

### Permisos por módulo (referencia)
```
projects.*        → CRUD de proyectos inmobiliarios
towers.*          → CRUD de torres/bloques
units.*           → CRUD de departamentos
typologies.*      → CRUD de tipologías
simulator.use     → acceso al cotizador (sin ver tablas de admin)
quotes.create     → emitir cotizaciones
quotes.read       → ver cotizaciones propias
quotes.read_all   → ver cotizaciones de todos
clients.*         → CRUD de clientes
users.*           → gestión de usuarios y roles
settings.*        → configuración de la app
cms.*             → edición del sitio web (futuro)
```

---

## Módulo: CRUD Inmobiliario (Sprint 1)

### Proyectos
- Campos: nombre, descripción, ubicación, moneda base
- Moneda base: seleccionable de una tabla de monedas del sistema
- Tasa de interés anual para créditos (aplica a todas las torres del proyecto)
- Tipos de crédito habilitados: crédito francés (on/off), crédito inteligente (on/off)
- Configuración de si la cotización muestra ambas opciones o solo una

### Torres / Bloques
- Pertenecen a un proyecto
- Campos: nombre, descripción, fecha de entrega, plazo máximo de financiamiento (años), % mínimo de PIE
- Un proyecto tiene 1 o más torres

### Tipologías
- Entidad independiente (catálogo global o por proyecto — a definir en diseño)
- Campos: nombre, superficie en m2, descripción, datos adicionales del tipo
- Se asignan a proyectos (un proyecto puede tener múltiples tipologías)

### Departamentos
- Pertenecen a una torre
- Campos: número de depto, piso, tipología asignada, precio de lista en moneda base
- La superficie se hereda de la tipología
- Un depto tiene una sola tipología

---

## Módulo: Cotizador / Simulador (Sprint 1)

El cotizador lee los datos del CRUD pero NO muestra las tablas de administración. Es un flujo de formulario separado con permiso propio (`simulator.use`).

### Flujo de selección
1. Seleccionar proyecto (dropdown)
2. Seleccionar torre (dropdown — filtra por proyecto)
3. Seleccionar departamento (dropdown — filtra por torre)
4. Se autocompletan: año de entrega, m2, precio de lista, % mínimo PIE

### Parámetros de financiamiento
- **PIE**: porcentaje ingresado por el usuario (mínimo = el asignado a la torre). Se muestra también en monto en moneda base.
- **Monto a financiar**: precio - PIE (calculado)
- **Moneda**: la del proyecto (informativa)

### Crédito Francés
- Plazo en años (default: máximo de la torre, editable)
- Tasa de interés: la del proyecto (anual, se convierte a mensual internamente)
- Output: cuota mensual, tabla de cuotas (N cuotas × valor cuota)
- Cálculo: K × (r(1+r)^n) / ((1+r)^n - 1)  donde r = tasa_anual/12, n = plazo_años × 12

### Crédito Inteligente (balloon payment)
- % PIE (igual al anterior)
- % a pagar en cuotas (define el capital a amortizar en cuotas)
- % pago final = 100% - %PIE - %cuotas (calculado automáticamente)
- Plazo N meses → paga N-1 cuotas normales + 1 cuota final grande (balloon)
- Las N-1 cuotas: crédito francés calculado sobre el monto de cuotas, a plazo MUCHO mayor (suficiente para que las cuotas sean chicas) pero liquidado al mes N-1
- Cuota N (balloon): saldo de capital restante + intereses de ese período
- **Concepto**: el cliente paga cuotas bajas durante el plazo, y en la cuota final liquida el saldo. Puede refinanciar esa deuda al momento de la entrega.
- Output: tabla con N-1 cuotas (valor) + cuota final (valor balloon)

### Output del cotizador
- Ambas opciones calculadas simultáneamente (si ambos tipos están habilitados en el proyecto)
- Resumen: proyecto, torre, depto, m2, piso, entrega, precio, PIE, monto financiado
- Detalle crédito francés: cuota mensual, plazo, total pagado
- Detalle crédito inteligente: cuotas normales, cuota balloon, total pagado
- Botón "Emitir Cotización" → lleva al flujo de Sprint 2

---

## Módulo: Emisión de Cotizaciones (Sprint 2)

### Datos del cliente
- Al iniciar una cotización: formulario con nombre completo, RUT, dirección, comuna, teléfono, email
- **Búsqueda en vivo**: mientras el usuario tipea, busca clientes existentes por nombre/RUT/email
- Si el cliente existe: se selecciona y se traen sus datos
- Si no existe: se crea un cliente nuevo con los datos ingresados
- Objetivo: evitar duplicados y mantener historial por cliente

### Cotización
- Vincula: cliente + departamento + parámetros de financiamiento calculados
- Guardada permanentemente en la base de datos
- Puede generarse el PDF las veces que sea necesario (idempotente)
- Un cliente puede tener múltiples cotizaciones (diferentes deptos, diferentes fechas)
- Se guarda fecha/hora de emisión y usuario que la emitió

### PDF
- Generación server-side: HTML template → Supabase Edge Function → Chrome headless (o servicio externo)
- Template corporativo con marca Vitali Suites (logo, colores, tipografías)
- Contenido: todos los datos del depto, proyecto, torre, cliente, opciones de financiamiento
- La plantilla debe ser editable por usuarios con permiso `settings.*`
- En el futuro: incluir plano de piso, plano de ubicación de torre, renders del depto
- Descargable en PDF desde la app

---

## Módulo: Email (Sprint 3)

### Configuración por vendedor
- Cada usuario tiene en su perfil: servidor SMTP, puerto, email remitente
- El dominio es el mismo para todos (`@vitalisuites.com`), pero el usuario/pass es individual
- La contraseña SMTP se almacena cifrada en **Supabase Vault** — nunca viaja al cliente
- La Edge Function lee las credenciales del Vault en runtime para enviar

### Envío de cotización
- Desde la cotización guardada, botón "Enviar por email"
- El email sale del correo del vendedor (credenciales de su perfil)
- Adjunta el PDF de la cotización
- El cuerpo del email usa una plantilla editable por admins
- El cliente recibe el email como si lo hubiera mandado el vendedor directamente

---

## Módulo: CMS Sitio Web (Futuro — no planificado)

### Partes editables del sitio vitalisuites.com
- Proyectos: nombre, descripción, ubicación, imágenes, estado
- Blog: posts con título, contenido, fecha, autor, categoría
- Apariciones en prensa: nombre del medio, enlace, fecha, resumen
- Datos de contacto: teléfonos, emails, direcciones por país
- Redes sociales: URLs de cada red
- Botón WhatsApp: número configurable
- Configuración general: textos, SEO

### Imágenes en el CMS
- El usuario sube una imagen original
- El sistema la procesa client-side (browser-image-compression) antes de subir: convierte a WebP, comprime, limita dimensiones
- Cuando pasen a Supabase Pro: procesamiento server-side con Edge Function + Sharp, generando variantes responsive

---

## Módulo: Clientes (Crece desde Sprint 2)

- CRUD completo de clientes
- Historial de cotizaciones por cliente
- En el futuro: plan de pagos, cobranza, alertas

---

## Módulo: Cobranza (Futuro — no planificado)

- Cuando un cliente compra, se crea un plan de pagos
- Tracking de cuotas pagadas / pendientes / vencidas
- Alertas automáticas por email/WhatsApp
- Dashboard de estado por cliente

---

## Requerimientos No Funcionales

### Escalabilidad / Multi-tenant (futuro)
- La app debe ser agnóstica al negocio: los colores, logo, tipografías, nombre de empresa son configurables
- Los módulos son habilitables/deshabilitables por configuración (crédito francés on/off, etc.)
- En el futuro puede usarse para otra empresa — todo el branding debe poder cambiarse desde settings

### Seguridad
- RLS en todas las tablas desde el día 1
- Credenciales SMTP en Supabase Vault
- El PAT de Supabase y secrets de deploy van en GitHub Secrets / variables de entorno locales, nunca en el repo
- `.claude/settings.json` debe estar en `.gitignore`

### Performance
- El frontend es una SPA — todas las interacciones deben sentirse instantáneas
- Los cálculos financieros se hacen en Edge Functions (server-side) — el frontend espera el resultado
- Imágenes optimizadas antes de subir (ver módulo CMS)
