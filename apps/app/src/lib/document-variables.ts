// ============================================================
// vitali-app — Variables de documentos
// Fuente de verdad para las variables disponibles en templates
// ============================================================

export interface VariableDefinition {
  key: string
  label: string
  example: string
}

export interface DataBlock {
  id: string
  label: string
  variables: VariableDefinition[]
}

/**
 * Bloques de datos disponibles en todos los documentos.
 * La sintaxis Carbone en el .docx usa {d.<key>}.
 */
export const DATA_BLOCKS: DataBlock[] = [
  {
    id: 'cliente',
    label: 'Cliente',
    variables: [
      { key: 'd.cliente.nombre', label: 'Nombre completo', example: 'Juan Pérez González' },
      { key: 'd.cliente.rut', label: 'RUT', example: '12.345.678-9' },
      { key: 'd.cliente.email', label: 'Email', example: 'juan@ejemplo.com' },
      { key: 'd.cliente.phone', label: 'Teléfono', example: '+56 9 1234 5678' },
      { key: 'd.cliente.address', label: 'Dirección', example: 'Av. Providencia 1234' },
      { key: 'd.cliente.commune', label: 'Comuna', example: 'Providencia' },
    ],
  },
  {
    id: 'proyecto',
    label: 'Proyecto',
    variables: [
      { key: 'd.proyecto.nombre', label: 'Nombre del proyecto', example: 'Vitali Las Condes' },
      { key: 'd.proyecto.moneda.codigo', label: 'Código de moneda', example: 'CLP' },
      { key: 'd.proyecto.moneda.simbolo', label: 'Símbolo de moneda', example: '$' },
      { key: 'd.proyecto.tasa_anual', label: 'Tasa anual (%)', example: '8.00' },
    ],
  },
  {
    id: 'torre',
    label: 'Torre / Bloque',
    variables: [
      { key: 'd.torre.nombre', label: 'Nombre de la torre', example: 'Torre A' },
      { key: 'd.torre.fecha_entrega', label: 'Fecha de entrega', example: '31/12/2026' },
      { key: 'd.torre.financiamiento_max_anos', label: 'Años máx. financiamiento', example: '20' },
      { key: 'd.torre.pie_minimo_pct', label: 'Pie mínimo (%)', example: '20' },
    ],
  },
  {
    id: 'unidad',
    label: 'Departamento',
    variables: [
      { key: 'd.unidad.numero', label: 'Número de depto', example: '305' },
      { key: 'd.unidad.piso', label: 'Piso', example: '3' },
      { key: 'd.unidad.tipologia', label: 'Tipología', example: '2D+2B' },
      { key: 'd.unidad.superficie', label: 'Superficie (m²)', example: '68.50' },
      { key: 'd.unidad.precio_lista', label: 'Precio de lista', example: '120.000.000' },
    ],
  },
  {
    id: 'cotizacion',
    label: 'Cotización',
    variables: [
      { key: 'd.cotizacion.pie_pct', label: 'Pie (%)', example: '20' },
      { key: 'd.cotizacion.pie_monto', label: 'Monto del pie', example: '24.000.000' },
      { key: 'd.cotizacion.monto_credito', label: 'Monto a financiar', example: '96.000.000' },
      { key: 'd.cotizacion.plazo_anos', label: 'Plazo (años)', example: '20' },
      { key: 'd.cotizacion.tipo_credito', label: 'Tipo de crédito', example: 'Francés' },
      { key: 'd.cotizacion.fecha', label: 'Fecha de cotización', example: '07/04/2026' },
    ],
  },
  {
    id: 'credito_frances',
    label: 'Crédito Francés',
    variables: [
      { key: 'd.frances.cuota_mensual', label: 'Cuota mensual', example: '800.000' },
      { key: 'd.frances.total_pagado', label: 'Total pagado', example: '192.000.000' },
      { key: 'd.frances.tasa_mensual', label: 'Tasa mensual (%)', example: '0.6434' },
    ],
  },
  {
    id: 'credito_inteligente',
    label: 'Crédito Inteligente',
    variables: [
      { key: 'd.inteligente.cuota_mensual', label: 'Cuota mensual', example: '400.000' },
      { key: 'd.inteligente.globo', label: 'Pago globo', example: '48.000.000' },
      { key: 'd.inteligente.pct_cuotas', label: '% en cuotas', example: '50' },
      { key: 'd.inteligente.pct_globo', label: '% en globo', example: '50' },
      { key: 'd.inteligente.total_pagado', label: 'Total pagado', example: '144.000.000' },
    ],
  },
]

/**
 * Qué bloques aplican a cada tipo de documento.
 */
export const DOCUMENT_TYPE_BLOCKS: Record<string, string[]> = {
  cotizacion: ['cliente', 'proyecto', 'torre', 'unidad', 'cotizacion', 'credito_frances', 'credito_inteligente'],
}

/**
 * Retorna los bloques de datos para un tipo de documento dado.
 */
export function getBlocksForDocumentType(documentType: string): DataBlock[] {
  const blockIds = DOCUMENT_TYPE_BLOCKS[documentType] ?? []
  return DATA_BLOCKS.filter(b => blockIds.includes(b.id))
}
