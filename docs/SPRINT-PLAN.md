# Plan de Sprints — vitali-app

## Sprint 0 — Setup (actual)
- Inicialización del monorepo (pnpm workspaces)
- Configuración de Vue 3 + Vite + Tailwind v4 + shadcn-vue
- Supabase: migraciones base (tablas del modelo de datos)
- Auth básico: login + sesión
- Layout shell: sidebar con navegación por permisos
- GitHub Actions: deploy staging + prod
- `.gitignore`, `README.md`, estructura de carpetas

## Sprint 1 — Cotizador MVP
**Objetivo**: Un vendedor puede seleccionar un depto y simular financiamiento.

### CRUD Inmobiliario
- [ ] Módulo Proyectos: listar, crear, editar, eliminar
- [ ] Módulo Torres: listar, crear, editar, eliminar (anidado en proyecto)
- [ ] Módulo Tipologías: listar, crear, editar, eliminar
- [ ] Módulo Departamentos: listar, crear, editar, eliminar (anidado en torre)

### Roles y Permisos
- [ ] Tabla de roles y permisos en DB
- [ ] UI de gestión de roles (Super Admin)
- [ ] UI de asignación de roles a usuarios
- [ ] Guards en router por permiso
- [ ] RLS en todas las tablas

### Cotizador
- [ ] Formulario de selección: proyecto → torre → depto
- [ ] Autocomplete de datos del depto al seleccionar
- [ ] Cálculo crédito francés (Edge Function)
- [ ] Cálculo crédito inteligente (Edge Function)
- [ ] Display de resultados: ambas opciones lado a lado
- [ ] TDD obligatorio para las Edge Functions de cálculo

## Sprint 2 — Cotización en PDF
**Objetivo**: El vendedor puede emitir una cotización formal en PDF y gestionar clientes.

### Clientes
- [ ] Búsqueda en vivo de clientes existentes (por nombre/RUT/email)
- [ ] Crear cliente nuevo si no existe
- [ ] Vista de clientes con historial de cotizaciones

### Cotización
- [ ] Formulario: datos del cliente + datos cotizados
- [ ] Guardar cotización en DB (con snapshot de datos)
- [ ] Generación de PDF (Edge Function + plantilla HTML)
- [ ] Descarga del PDF desde la app
- [ ] Listado de cotizaciones emitidas

### Plantilla PDF
- [ ] Template corporativo Vitali Suites
- [ ] Editable por usuarios con permiso de admin de documentos

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
- Sprint 0 en progreso
- MCP Supabase configurado (dev + prod)
- Skills instaladas
- Documentación base creada
- Pendiente: inicializar monorepo (pnpm workspaces + Vue app)
