# UI Standardization Refactor

## Objetivo
Estandarizar la interfaz de usuario en la aplicación Vitali App, específicamente unificando el diseño y comportamiento de las tablas de datos (`Stock`, `Quotes`, `Clients`), reduciendo la duplicación de código mediante componentes reutilizables (DRY) y mejorando la UX general (indicadores de carga, espaciado de paneles).

## Cambios Implementados

### 1. Componentes "Dumb" Reutilizables
Se abstrajo la lógica compleja y repetitiva de las tablas en componentes base:
- **`DataTablePagination.vue`**: Componente centralizado para manejar los controles de paginación de cualquier tabla, incluyendo selección de filas por página y navegación (anterior/siguiente).
- **`DataTableColumnHeader.vue`**: Componente estándar para las cabeceras de columnas, el cual maneja los íconos de flechas (`asc`/`desc`) interactivos y emite eventos genéricos `@sort` para el ordenamiento local.

### 2. Refactorización de Vistas
Se migraron las vistas principales para utilizar estos nuevos componentes estándar:
- **`StockView.vue`**: Migrada para usar la paginación genérica y las cabeceras ordenables. Se resolvió un problema de tipado estricto (`SortKey`) en el evento de ordenamiento.
- **`QuotesView.vue`**: Integración de cabeceras de ordenamiento estándar. Se corrigieron además múltiples errores de linter (`max-statements-per-line`) en el `switch/case` de ordenamiento.
- **`ClientsView.vue`**: 
  - Se agregó soporte completo de paginación.
  - Se añadieron cabeceras ordenables para todas las columnas de texto.
  - Se corrigieron crasheos del DOM por errores tipográficos (`</tablebody>`) y de importación de componentes de tabla (`TableHeader`, `TableRow`).
  - Se estandarizó el aspecto visual de los botones de acción ("Editar" y "Eliminar") utilizando el componente genérico `<Button>` con las variantes `outline` y `destructive`, alineando la estética con el resto de la aplicación (e.g. `UsersView`).

### 3. Mejoras de UX Adicionales
- **`SheetContent.vue`**: Se estandarizó el padding general de todos los paneles laterales agregando las clases `p-6 pr-8`, garantizando márgenes correctos y que los botones de cerrado no se superpongan con el texto.
- **`LoadingOverlay.vue`**: Se introdujo un overlay global de carga bloqueante que se usa en operaciones asíncronas pesadas (como la solicitud de generación de PDFs en Quotes), impidiendo que el usuario se desespere e intente repetir acciones.

### 4. Calidad de Código
- Se resolvieron todos los errores y advertencias del linter pendientes en los archivos modificados. La ejecución de `pnpm lint` en `apps/app` es ahora limpia (exit code 0).
- Se solucionaron las fallas del entorno local (`vite`), en particular agregando de vuelta importaciones faltantes de librerías nativas (`watch` desde vue).
