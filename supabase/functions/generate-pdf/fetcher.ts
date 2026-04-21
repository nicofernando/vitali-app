import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface QuoteRecord {
  id: string
  created_by: string
  status: string
  credit_type: 'french' | 'smart' | 'both'
  pie_percentage: number
  pie_amount: number
  financing_amount: number
  term_years: number
  monthly_rate: number
  monthly_payment: number | null
  balloon_payment: number | null
  smart_cuotas_percentage: number | null
  quote_data_snapshot: Record<string, unknown>
  created_at: string
  client: {
    full_name: string
    rut: string | null
    email: string | null
    phone: string | null
    address: string | null
    commune: string | null
  }
  unit: {
    unit_number: string
    floor: number | null
    list_price: number
    typology: {
      name: string
      surface_m2: number
    }
    tower: {
      name: string
      delivery_date: string | null
      max_financing_years: number
      min_pie_percentage: number
      project: {
        name: string
        annual_interest_rate: number
        currency: {
          code: string
          symbol: string
        }
      }
    }
  }
}

export async function fetchQuoteRecord(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<QuoteRecord> {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id, created_by, status, credit_type,
      pie_percentage, pie_amount, financing_amount,
      term_years, monthly_rate, monthly_payment, balloon_payment,
      smart_cuotas_percentage, quote_data_snapshot, created_at,
      client:clients ( full_name, rut, email, phone, address, commune ),
      unit:units (
        unit_number, floor, list_price,
        typology:typologies ( name, surface_m2 ),
        tower:towers (
          name, delivery_date, max_financing_years, min_pie_percentage,
          project:projects (
            name, annual_interest_rate,
            currency:currencies ( code, symbol )
          )
        )
      )
    `)
    .eq('id', quoteId)
    .single()

  if (error) {
    throw new Error(`Error fetching quote: ${error.message}`)
  }

  const record = data as unknown as QuoteRecord
  if (
    !record.client
    || Array.isArray(record.client)
    || !record.unit
    || Array.isArray(record.unit)
    || !record.unit.typology
    || !record.unit.tower
    || !record.unit.tower.project
    || !record.unit.tower.project.currency
  ) {
    throw new Error('Quote incompleta: faltan datos de cliente, unidad, tipología, torre, proyecto o moneda')
  }

  return record
}
