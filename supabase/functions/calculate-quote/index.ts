import { createClient } from 'jsr:@supabase/supabase-js@2'
import { calculateFrench } from './french.ts'
import { calculateSmart } from './smart.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculateQuoteRequest {
  unit_id: string
  pie_percentage: number
  term_years: number
  credit_type: 'french' | 'smart' | 'both'
  smart_cuotas_percentage?: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: unknown
    try {
      body = await req.json()
    }
    catch {
      return new Response(
        JSON.stringify({ error: 'Request body inválido — se esperaba JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { unit_id, pie_percentage, term_years, credit_type, smart_cuotas_percentage } = body as CalculateQuoteRequest

    // Validaciones básicas
    if (!unit_id || pie_percentage == null || !term_years || !credit_type) {
      return new Response(JSON.stringify({ error: 'Parámetros requeridos: unit_id, pie_percentage, term_years, credit_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if ((credit_type === 'smart' || credit_type === 'both') && smart_cuotas_percentage == null) {
      return new Response(JSON.stringify({ error: 'smart_cuotas_percentage es requerido para crédito inteligente' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar unidad con su torre, proyecto y moneda
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select(`
        id, unit_number, floor, list_price, typology_id,
        typology:typologies(name, surface_m2),
        tower:towers(
          id, name, delivery_date, max_financing_years, min_pie_percentage,
          project:projects(
            id, name, annual_interest_rate, french_credit_enabled, smart_credit_enabled,
            currency:currencies(id, code, name, symbol)
          )
        )
      `)
      .eq('id', unit_id)
      .single()

    if (unitError || !unit) {
      return new Response(JSON.stringify({ error: 'Departamento no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tower = (unit as { tower: Record<string, unknown> }).tower
    const project = (tower as { project: Record<string, unknown> }).project

    // Validar PIE mínimo
    const minPie = (tower as { min_pie_percentage: number }).min_pie_percentage
    if (pie_percentage < minPie) {
      return new Response(JSON.stringify({ error: `PIE mínimo es ${minPie}%` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validar plazo máximo de financiamiento
    const maxYears = (tower as { max_financing_years: number }).max_financing_years
    if (term_years > maxYears) {
      return new Response(
        JSON.stringify({ error: `El plazo máximo permitido es ${maxYears} años` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validar créditos habilitados
    if ((credit_type === 'french' || credit_type === 'both') && !(project as { french_credit_enabled: boolean }).french_credit_enabled) {
      return new Response(JSON.stringify({ error: 'Crédito francés no habilitado para este proyecto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if ((credit_type === 'smart' || credit_type === 'both') && !(project as { smart_credit_enabled: boolean }).smart_credit_enabled) {
      return new Response(JSON.stringify({ error: 'Crédito inteligente no habilitado para este proyecto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const listPrice = (unit as { list_price: number }).list_price
    const annualRate = (project as { annual_interest_rate: number }).annual_interest_rate
    const pieAmount = (listPrice * pie_percentage) / 100
    const financingAmount = listPrice - pieAmount

    const response: Record<string, unknown> = {
      unit: {
        id: (unit as { id: string }).id,
        unit_number: (unit as { unit_number: string }).unit_number,
        floor: (unit as { floor: number | null }).floor,
        list_price: listPrice,
        typology: (unit as { typology: unknown }).typology,
      },
      tower: {
        id: (tower as { id: string }).id,
        name: (tower as { name: string }).name,
        delivery_date: (tower as { delivery_date: string | null }).delivery_date,
        max_financing_years: (tower as { max_financing_years: number }).max_financing_years,
        min_pie_percentage: minPie,
      },
      project: {
        id: (project as { id: string }).id,
        name: (project as { name: string }).name,
        annual_interest_rate: annualRate,
        french_credit_enabled: (project as { french_credit_enabled: boolean }).french_credit_enabled,
        smart_credit_enabled: (project as { smart_credit_enabled: boolean }).smart_credit_enabled,
        currency: (project as { currency: unknown }).currency,
      },
      pie_amount: Math.round(pieAmount * 100) / 100,
      financing_amount: Math.round(financingAmount * 100) / 100,
    }

    if (credit_type === 'french' || credit_type === 'both') {
      response.french = calculateFrench(financingAmount, annualRate, term_years)
    }

    if (credit_type === 'smart' || credit_type === 'both') {
      response.smart = calculateSmart(listPrice, annualRate, term_years, smart_cuotas_percentage!, pie_percentage)
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
