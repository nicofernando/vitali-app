import type { ClientRecord, QuoteRecord, UnitRecord } from './fetcher.ts'

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate)
    return ''
  const d = new Date(isoDate)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

function creditTypeLabel(type: 'french' | 'smart' | 'both'): string {
  if (type === 'french')
    return 'Francés'
  if (type === 'smart')
    return 'Inteligente'
  return 'Francés e Inteligente'
}

export interface DocumentData {
  cliente?: {
    nombre: string
    rut: string | null
    email: string | null
    phone: string | null
    address: string | null
    commune: string | null
  }
  proyecto?: {
    nombre: string
    tasa_anual: string
    moneda: { codigo: string, simbolo: string }
  }
  torre?: {
    nombre: string
    fecha_entrega: string
    financiamiento_max_anos: number
    pie_minimo_pct: number
  }
  unidad?: {
    numero: string
    piso: number | null
    tipologia: string
    superficie: number
    precio_lista: number
  }
  cotizacion?: {
    pie_pct: number
    pie_monto: number
    monto_credito: number
    plazo_anos: number
    tipo_credito: string
    fecha: string
  }
  frances?: {
    cuota_mensual: number
    tasa_mensual: number
    total_pagado: number
  }
  inteligente?: {
    cuota_mensual: number
    globo: number
    pct_cuotas: number
    pct_globo: number
    total_pagado: number
  }
}

function buildClienteBlock(client: Pick<ClientRecord, 'full_name' | 'rut' | 'email' | 'phone' | 'address' | 'commune'>): DocumentData['cliente'] {
  return {
    nombre: client.full_name,
    rut: client.rut,
    email: client.email,
    phone: client.phone,
    address: client.address,
    commune: client.commune,
  }
}

function buildProyectoBlock(project: UnitRecord['tower']['project']): DocumentData['proyecto'] {
  return {
    nombre: project.name,
    tasa_anual: ((project.annual_interest_rate ?? 0) * 100).toFixed(2),
    moneda: { codigo: project.currency.code, simbolo: project.currency.symbol },
  }
}

function buildTorreBlock(tower: UnitRecord['tower']): DocumentData['torre'] {
  return {
    nombre: tower.name,
    fecha_entrega: formatDate(tower.delivery_date),
    financiamiento_max_anos: tower.max_financing_years,
    pie_minimo_pct: tower.min_pie_percentage,
  }
}

function buildUnidadBlock(unit: UnitRecord): DocumentData['unidad'] {
  return {
    numero: unit.unit_number,
    piso: unit.floor,
    tipologia: unit.typology.name,
    superficie: unit.typology.surface_m2,
    precio_lista: unit.list_price,
  }
}

/**
 * Construye el objeto de datos para Carbone a partir de los registros disponibles.
 * Carbone ignora silenciosamente las variables no presentes — solo se incluyen
 * los bloques que se pudieron obtener.
 */
export function buildDocumentData(input: {
  quote?: QuoteRecord | null
  unit?: UnitRecord | null
  client?: ClientRecord | null
}): DocumentData {
  const data: DocumentData = {}

  if (input.quote) {
    const { client, unit } = input.quote
    const { tower } = unit
    const { project } = tower

    data.cliente = buildClienteBlock(client)
    data.proyecto = buildProyectoBlock(project)
    data.torre = buildTorreBlock(tower)
    data.unidad = buildUnidadBlock(unit)
    data.cotizacion = {
      pie_pct: input.quote.pie_percentage,
      pie_monto: input.quote.pie_amount,
      monto_credito: input.quote.financing_amount,
      plazo_anos: input.quote.term_years,
      tipo_credito: creditTypeLabel(input.quote.credit_type),
      fecha: formatDate(new Date().toISOString()),
    }

    if (input.quote.credit_type === 'french' || input.quote.credit_type === 'both') {
      const termMonths = input.quote.term_years * 12
      data.frances = {
        cuota_mensual: input.quote.monthly_payment ?? 0,
        tasa_mensual: input.quote.monthly_rate,
        total_pagado: (input.quote.monthly_payment ?? 0) * termMonths,
      }
    }

    if (input.quote.credit_type === 'smart' || input.quote.credit_type === 'both') {
      const termMonths = input.quote.term_years * 12
      const pctCuotas = input.quote.smart_cuotas_percentage ?? 50
      const pctGlobo = 100 - pctCuotas
      const snapshot = input.quote.quote_data_snapshot as { smart?: { cuotas_payment?: number } }
      const smartCuota = input.quote.credit_type === 'both'
        ? (snapshot.smart?.cuotas_payment ?? 0)
        : (input.quote.monthly_payment ?? 0)
      data.inteligente = {
        cuota_mensual: smartCuota,
        globo: input.quote.balloon_payment ?? 0,
        pct_cuotas: pctCuotas,
        pct_globo: pctGlobo,
        total_pagado: smartCuota * termMonths + (input.quote.balloon_payment ?? 0),
      }
    }

    return data
  }

  // Sin cotización: construir desde unit y/o client independientes
  if (input.unit) {
    data.proyecto = buildProyectoBlock(input.unit.tower.project)
    data.torre = buildTorreBlock(input.unit.tower)
    data.unidad = buildUnidadBlock(input.unit)
  }

  if (input.client) {
    data.cliente = buildClienteBlock(input.client)
  }

  return data
}
