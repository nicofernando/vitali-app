import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { fetchQuoteRecord } from './fetcher.ts'

const baseRecord = {
  id: 'q1',
  created_by: 'u1',
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
  client: { full_name: 'Juan', rut: null, email: null, phone: null, address: null, commune: null },
  unit: {
    unit_number: '305',
    floor: 3,
    list_price: 120000000,
    typology: { name: '2D+2B', surface_m2: 68.5 },
    tower: {
      name: 'Torre A',
      delivery_date: null,
      max_financing_years: 20,
      min_pie_percentage: 20,
      project: {
        name: 'Vitali',
        annual_interest_rate: 0.08,
        currency: { code: 'CLP', symbol: '$' },
      },
    },
  },
}

function makeMock(data: unknown, error: unknown = null): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data, error }),
        })),
      })),
    })),
  } as unknown as SupabaseClient
}

describe('fetchQuoteRecord', () => {
  it('retorna el record completo cuando la consulta es exitosa', async () => {
    const record = await fetchQuoteRecord(makeMock(baseRecord), 'q1')
    expect(record.id).toBe('q1')
    expect(record.client.full_name).toBe('Juan')
    expect(record.unit.tower.project.currency.code).toBe('CLP')
  })

  it('lanza error cuando Supabase retorna error', async () => {
    await expect(
      fetchQuoteRecord(makeMock(null, { message: 'RLS violation' }), 'q1'),
    ).rejects.toThrow('RLS violation')
  })

  it('lanza error cuando client es null', async () => {
    await expect(
      fetchQuoteRecord(makeMock({ ...baseRecord, client: null }), 'q1'),
    ).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando client es array (join retorna múltiples filas)', async () => {
    await expect(
      fetchQuoteRecord(makeMock({ ...baseRecord, client: [] }), 'q1'),
    ).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando unit es null', async () => {
    await expect(
      fetchQuoteRecord(makeMock({ ...baseRecord, unit: null }), 'q1'),
    ).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando typology es null', async () => {
    const data = { ...baseRecord, unit: { ...baseRecord.unit, typology: null } }
    await expect(fetchQuoteRecord(makeMock(data), 'q1')).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando tower es null', async () => {
    const data = { ...baseRecord, unit: { ...baseRecord.unit, tower: null } }
    await expect(fetchQuoteRecord(makeMock(data), 'q1')).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando project es null', async () => {
    const data = {
      ...baseRecord,
      unit: { ...baseRecord.unit, tower: { ...baseRecord.unit.tower, project: null } },
    }
    await expect(fetchQuoteRecord(makeMock(data), 'q1')).rejects.toThrow('Quote incompleta')
  })

  it('lanza error cuando currency es null', async () => {
    const data = {
      ...baseRecord,
      unit: {
        ...baseRecord.unit,
        tower: {
          ...baseRecord.unit.tower,
          project: { ...baseRecord.unit.tower.project, currency: null },
        },
      },
    }
    await expect(fetchQuoteRecord(makeMock(data), 'q1')).rejects.toThrow('Quote incompleta')
  })
})
