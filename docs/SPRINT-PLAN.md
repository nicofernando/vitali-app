# Plan de Sprints — vitali-app

## Sprint 0 — Setup (actual)
- Inicialización del monorepo (pnpm workspaces)
- Configuración de Vue 3 + Vite + Tailwind v4 + shadcn-vue
- Supabase: migraciones base (tablas del modelo de datos)
- Auth básico: login + sesión
- Layout shell: sidebar con navegación por permisos
- GitHub Actions: deploy staging + prod
- `.gitignore`, `README.md`, estructura de carpetas

## Sprint 1 — Cotizador MVP ✅
**Objetivo**: Un vendedor puede seleccionar un depto y simular financiamiento.

### CRUD Inmobiliario
- [x] Módulo Proyectos: listar, crear, editar, eliminar
- [x] Módulo Torres: listar, crear, editar, eliminar (anidado en proyecto)
- [x] Módulo Tipologías: listar, crear, editar, eliminar
- [x] Módulo Departamentos: listar, crear, editar, eliminar (anidado en torre)

### Roles y Permisos
- [x] Tabla de roles y permisos en DB
- [x] UI de gestión de roles (Super Admin)
- [x] UI de asignación de roles a usuarios
- [x] Guards en router por permiso
- [x] RLS en todas las tablas

### Cotizador
- [x] Formulario de selección: proyecto → torre → depto
- [x] Autocomplete de datos del depto al seleccionar
- [x] Cálculo crédito francés (Edge Function)
- [x] Cálculo crédito inteligente (Edge Function)
- [x] Display de resultados: ambas opciones lado a lado
- [x] TDD obligatorio para las Edge Functions de cálculo

## Sprint 2 — Cotización en PDF ✅
**Objetivo**: El vendedor puede emitir una cotización formal en PDF y gestionar clientes.

### Clientes
- [x] Búsqueda en vivo de clientes existentes (por nombre/RUT/email)
- [x] Crear cliente nuevo si no existe
- [x] Vista de clientes con historial de cotizaciones

### Cotización
- [x] Formulario: datos del cliente + datos cotizados
- [x] Guardar cotización en DB (con snapshot de datos)
- [x] Generación de PDF (Edge Function Carbone.io + template .docx)
- [x] Descarga del PDF desde la app
- [x] Listado de cotizaciones emitidas

### Plantilla PDF
- [x] Template mínimo funcional subido a Storage (scripts/build_cotizacion_template.py)
- [ ] Template corporativo Vitali Suites (pendiente: diseño entregado por cliente)
- [ ] Editable por usuarios con permiso de admin de documentos (→ S3)

## Sprint 3 — Email
**Objetivo**: La cotización llega al cliente por email desde el correo del vendedor.

- [ ] Perfil de usuario: configuración SMTP (host, puerto, usuario)
- [ ] Almacenamiento seguro de contraseña SMTP en Supabase Vault
- [ ] Edge Function de envío de email con adjunto PDF
- [ ] UI de envío desde la cotización
- [ ] Plantilla de email editable por admins
- [ ] Historial de envíos por cotización

## Sprints Futuros (no planificados)

### CMS Sitio Web
- Edición de proyectos para vitalisuites.com
- Blog
- Apariciones en prensa
- Datos de contacto, RRSS, botón WhatsApp
- Migración sitio actual de Vite/React a Astro

### Portal de Clientes
- Login para compradores en vitalisuites.com
- Simulador simplificado público
- Vista del propio plan de pagos

### Cobranza
- Plan de pagos por cliente comprador
- Tracking de cuotas pagadas/pendientes/vencidas
- Alertas automáticas (email, WhatsApp)
- Dashboard de cobranza

### Dashboard Comercial
- Métricas de cotizaciones, conversión, vendedores
- Estado de inventario de deptos disponibles/vendidos
- Pipeline de clientes

---

## Estado Actual
- Sprint 1 completo ✅
- Sprint 2 completo ✅ — en QA (staging.vitalisuites.com)
- Sprint 3 planificado (Email)
