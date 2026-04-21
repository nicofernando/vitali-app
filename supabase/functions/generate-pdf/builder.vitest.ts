import { describe, expect, it } from 'vitest'
import { buildCarboneData } from './builder.ts'
import type { QuoteRecord } from './fetcher.ts'

const fakeRecord: QuoteRecord = {
  id: 'q1',
  status: 'draft',
  credit_type: 'french',
  pie_percentage: 20,
  pie_amount: 24000000,
  financing_amount: 96000000,
  term_years: 20,
  monthly_rate: 0.006434,
  monthly_payment: 800000,
  balloon_payment: null,
  smart_cuotas_percentage: null,
  quote_data_snapshot: {},
  created_at: '2026-04-07T00:00:00Z',
  client: {
    full_name: 'Juan Pérez',
    rut: '12.345.678-9',
    email: 'juan@test.com',
    phone: '+56912345678',
    address: 'Av. Providencia 1234',
    commune: 'Providencia',
  },
  unit: {
    unit_number: '305',
    floor: 3,
    list_price: 120000000,
    typology: { name: '2D+2B', surface_m2: 68.5 },
    tower: {
      name: 'Torre A',
      delivery_date: '2026-12-31',
      max_financing_years: 20,
      min_pie_percentage: 20,
      project: {
        name: 'Vitali Las Condes',
        annual_interest_rate: 0.08,
        currency: { code: 'CLP', symbol: '$' },
      },
    },
  },
}

describe('buildCarboneData', () => {
  it('mapea correctamente los datos del cliente', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.cliente.nombre).toBe('Juan Pérez')
    expect(data.cliente.rut).toBe('12.345.678-9')
    expect(data.cliente.email).toBe('juan@test.com')
    expect(data.cliente.phone).toBe('+56912345678')
    expect(data.cliente.address).toBe('Av. Providencia 1234')
    expect(data.cliente.commune).toBe('Providencia')
  })

  it('mapea correctamente los datos del proyecto', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.proyecto.nombre).toBe('Vitali Las Condes')
    expect(data.proyecto.moneda.codigo).toBe('CLP')
    expect(data.proyecto.moneda.simbolo).toBe('$')
    expect(data.proyecto.tasa_anual).toBe('8.00')
  })

  it('mapea correctamente los datos de la torre', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.torre.nombre).toBe('Torre A')
    expect(data.torre.fecha_entrega).toBe('31/12/2026')
    expect(data.torre.financiamiento_max_anos).toBe(20)
    expect(data.torre.pie_minimo_pct).toBe(20)
  })

  it('mapea correctamente los datos de la unidad', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.unidad.numero).toBe('305')
    expect(data.unidad.piso).toBe(3)
    expect(data.unidad.tipologia).toBe('2D+2B')
    expect(data.unidad.superficie).toBe(68.5)
    expect(data.unidad.precio_lista).toBe(120000000)
  })

  it('mapea correctamente los datos de cotización', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.cotizacion.pie_pct).toBe(20)
    expect(data.cotizacion.pie_monto).toBe(24000000)
    expect(data.cotizacion.monto_credito).toBe(96000000)
    expect(data.cotizacion.plazo_anos).toBe(20)
    expect(data.cotizacion.tipo_credito).toBe('Francés')
    expect(data.cotizacion.fecha).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('mapea crédito francés cuando credit_type es french', () => {
    const data = buildCarboneData(fakeRecord)
    expect(data.frances).toBeDefined()
    expect(data.frances!.cuota_mensual).toBe(800000)
    expect(data.frances!.tasa_mensual).toBeCloseTo(0.006434, 6)
  })

  it('no incluye frances cuando credit_type es smart', () => {
    const smartRecord: QuoteRecord = {
      ...fakeRecord,
      credit_type: 'smart',
      monthly_payment: 400000,
      balloon_payment: 48000000,
      smart_cuotas_percentage: 50,
    }
    const data = buildCarboneData(smartRecord)
    expect(data.frances).toBeUndefined()
    expect(data.inteligente).toBeDefined()
    expect(data.inteligente!.cuota_mensual).toBe(400000)
    expect(data.inteligente!.globo).toBe(48000000)
    expect(data.inteligente!.pct_cuotas).toBe(50)
    expect(data.inteligente!.pct_globo).toBe(50)
  })

  it('incluye ambos créditos cuando credit_type es both', () => {
    const bothRecord: QuoteRecord = {
      ...fakeRecord,
      credit_type: 'both',
      monthly_payment: 800000,
      balloon_payment: 48000000,
      smart_cuotas_percentage: 50,
    }
    const data = buildCarboneData(bothRecord)
    expect(data.frances).toBeDefined()
    expect(data.inteligente).toBeDefined()
  })

  it('fecha de entrega nula se formatea como cadena vacía', () => {
    const record: QuoteRecord = {
      ...fakeRecord,
      unit: {
        ...fakeRecord.unit,
        tower: { ...fakeRecord.unit.tower, delivery_date: null },
      },
    }
    const data = buildCarboneData(record)
    expect(data.torre.fecha_entrega).toBe('')
  })
})
