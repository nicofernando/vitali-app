import type { QuoteRecord } from './fetcher.ts'

interface FrancesData {
  cuota_mensual: number
  tasa_mensual: number
  total_pagado: number
}

interface InteligenteData {
  cuota_mensual: number
  globo: number
  pct_cuotas: number
  pct_globo: number
  total_pagado: number
}

export interface CarboneData {
  cliente: {
    nombre: string
    rut: string | null
    email: string | null
    phone: string | null
    address: string | null
    commune: string | null
  }
  proyecto: {
    nombre: string
    tasa_anual: string
    moneda: {
      codigo: string
      simbolo: string
    }
  }
  torre: {
    nombre: string
    fecha_entrega: string
    financiamiento_max_anos: number
    pie_minimo_pct: number
  }
  unidad: {
    numero: string
    piso: number | null
    tipologia: string
    superficie: number
    precio_lista: number
  }
  cotizacion: {
    pie_pct: number
    pie_monto: number
    monto_credito: number
    plazo_anos: number
    tipo_credito: string
    fecha: string
  }
  frances?: FrancesData
  inteligente?: InteligenteData
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

function creditTypeLabel(type: 'french' | 'smart' | 'both'): string {
  if (type === 'french') return 'Francés'
  if (type === 'smart') return 'Inteligente'
  return 'Francés e Inteligente'
}

export function buildCarboneData(record: QuoteRecord): CarboneData {
  const { client, unit } = record
  const { tower } = unit
  const { project } = tower

  const data: CarboneData = {
    cliente: {
      nombre: client.full_name,
      rut: client.rut,
      email: client.email,
      phone: client.phone,
      address: client.address,
      commune: client.commune,
    },
    proyecto: {
      nombre: project.name,
      tasa_anual: ((project.annual_interest_rate ?? 0) * 100).toFixed(2),
      moneda: {
        codigo: project.currency.code,
        simbolo: project.currency.symbol,
      },
    },
    torre: {
      nombre: tower.name,
      fecha_entrega: formatDate(tower.delivery_date),
      financiamiento_max_anos: tower.max_financing_years,
      pie_minimo_pct: tower.min_pie_percentage,
    },
    unidad: {
      numero: unit.unit_number,
      piso: unit.floor,
      tipologia: unit.typology.name,
      superficie: unit.typology.surface_m2,
      precio_lista: unit.list_price,
    },
    cotizacion: {
      pie_pct: record.pie_percentage,
      pie_monto: record.pie_amount,
      monto_credito: record.financing_amount,
      plazo_anos: record.term_years,
      tipo_credito: creditTypeLabel(record.credit_type),
      fecha: formatDate(new Date().toISOString()),
    },
  }

  if (record.credit_type === 'french' || record.credit_type === 'both') {
    const termMonths = record.term_years * 12
    data.frances = {
      cuota_mensual: record.monthly_payment ?? 0,
      tasa_mensual: record.monthly_rate,
      total_pagado: (record.monthly_payment ?? 0) * termMonths,
    }
  }

  if (record.credit_type === 'smart' || record.credit_type === 'both') {
    const termMonths = record.term_years * 12
    const pctCuotas = record.smart_cuotas_percentage ?? 50
    const pctGlobo = 100 - pctCuotas
    // Para tipo 'both', monthly_payment en BD contiene el valor del crédito francés.
    // La cuota del crédito inteligente se recupera del snapshot completo.
    const snapshot = record.quote_data_snapshot as { smart?: { cuotas_payment?: number } }
    const smartCuota = record.credit_type === 'both'
      ? (snapshot.smart?.cuotas_payment ?? record.balloon_payment ?? 0)
      : (record.monthly_payment ?? 0)
    data.inteligente = {
      cuota_mensual: smartCuota,
      globo: record.balloon_payment ?? 0,
      pct_cuotas: pctCuotas,
      pct_globo: pctGlobo,
      total_pagado: smartCuota * termMonths + (record.balloon_payment ?? 0),
    }
  }

  return data
}
