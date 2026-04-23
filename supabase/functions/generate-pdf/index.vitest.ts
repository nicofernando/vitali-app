import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted runs at the same time as vi.mock (both are hoisted before imports),
// so mockCreateClient is available inside the factory.
const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))

vi.mock('jsr:@supabase/supabase-js@2', () => ({ createClient: mockCreateClient }))
vi.mock('./fetcher.ts', () => ({ fetchQuoteRecord: vi.fn() }))
vi.mock('./builder.ts', () => ({ buildCarboneData: vi.fn() }))

import { handler } from './index.ts'
import { fetchQuoteRecord } from './fetcher.ts'
import { buildCarboneData } from './builder.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function makeRequest(body: unknown, authorization = 'Bearer valid-token'): Request {
  return new Request('https://fn.supabase.co/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  })
}

/** Fake minimal QuoteRecord to satisfy fetchQuoteRecord mock */
const fakeRecord = {
  id: VALID_UUID,
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

/** Build a mock Supabase auth client that returns the given auth result */
function makeAuthClient(user: object | null, authError: object | null = null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }) } }
}

/** Build a mock Supabase service client with full storage + db mocks */
function makeServiceClient({
  templateError = null,
  templateBytes = new Uint8Array([1, 2, 3]),
  uploadStorageError = null,
  updateError = null,
  signedUrl = 'https://storage.supabase.co/quotes/signed',
  signError = null,
} = {}) {
  // jsdom's Blob polyfill lacks arrayBuffer(). Use a plain duck-type object instead.
  const templateBlob = templateBytes.byteLength > 0
    ? { arrayBuffer: async () => templateBytes.buffer.slice(templateBytes.byteOffset, templateBytes.byteOffset + templateBytes.byteLength) }
    : null

  return {
    storage: {
      from: vi.fn((bucket: string) => {
        if (bucket === 'templates') {
          return {
            download: vi.fn().mockResolvedValue({ data: templateBlob, error: templateError }),
          }
        }
        // quotes bucket
        return {
          upload: vi.fn().mockResolvedValue({ error: uploadStorageError }),
          createSignedUrl: vi.fn().mockResolvedValue({
            data: signError ? null : { signedUrl },
            error: signError,
          }),
        }
      }),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      })),
    })),
  }
}

/** Stub Deno.env.get to return all required env vars */
function setupEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    CARBONE_API_KEY: 'carbone-test-key',
  }
  // Use `key in overrides` so explicit `undefined` overrides the default (e.g. to remove CARBONE_API_KEY).
  ;(Deno as any).env.get = (key: string) => (key in overrides ? overrides[key] : defaults[key])
}

/** Stub globalThis.fetch to simulate the 3-step Carbone API flow */
function mockCarboneSuccess() {
  const pdfBytes = new Uint8Array([37, 80, 68, 70]) // %PDF magic bytes
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url === 'https://api.carbone.io/template') {
      return new Response(
        JSON.stringify({ success: true, data: { templateId: 'tmpl-123' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url === 'https://api.carbone.io/render/tmpl-123') {
      return new Response(
        JSON.stringify({ success: true, data: { renderId: 'rnd-456' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url === 'https://api.carbone.io/render/rnd-456') {
      return new Response(pdfBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    }
    return new Response('Not Found', { status: 404 })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generate-pdf handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  // ── CORS ──────────────────────────────────────────────────────────────────

  it('OPTIONS devuelve 200 ok (CORS preflight)', async () => {
    const req = new Request('https://fn.supabase.co/generate-pdf', { method: 'OPTIONS' })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  // ── Env vars ──────────────────────────────────────────────────────────────

  it('devuelve 500 cuando falta CARBONE_API_KEY', async () => {
    setupEnv({ CARBONE_API_KEY: undefined })
    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('CARBONE_API_KEY')
  })

  it('devuelve 500 cuando faltan env vars de Supabase', async () => {
    setupEnv({ SUPABASE_URL: undefined })
    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Supabase env vars')
  })

  // ── Autenticación ─────────────────────────────────────────────────────────

  it('devuelve 401 cuando el token es inválido', async () => {
    mockCreateClient.mockReturnValue(
      makeAuthClient(null, { message: 'invalid token' }) as any,
    )
    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('devuelve 401 cuando no hay usuario autenticado', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient(null) as any)
    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(401)
  })

  // ── Validación del body ───────────────────────────────────────────────────

  it('devuelve 400 cuando el body no es JSON válido', async () => {
    mockCreateClient.mockReturnValue(
      makeAuthClient({ id: 'u1' }) as any,
    )
    const req = new Request('https://fn.supabase.co/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid' },
      body: 'not-json',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('JSON')
  })

  it('devuelve 400 cuando falta quote_id', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient({ id: 'u1' }) as any)
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('quote_id')
  })

  it('devuelve 400 cuando quote_id no es UUID válido', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient({ id: 'u1' }) as any)
    const res = await handler(makeRequest({ quote_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('quote_id inválido')
  })

  // ── Errores en llamadas externas ──────────────────────────────────────────

  it('devuelve 500 cuando falla la descarga del template', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'u1' }) as any)
      .mockReturnValueOnce(makeServiceClient({ templateError: { message: 'Not found' } }) as any)
    vi.mocked(fetchQuoteRecord).mockResolvedValue(fakeRecord as any)
    vi.mocked(buildCarboneData).mockReturnValue({} as any)

    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('template')
  })

  it('devuelve 500 cuando Carbone rechaza el upload', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'u1' }) as any)
      .mockReturnValueOnce(makeServiceClient() as any)
    vi.mocked(fetchQuoteRecord).mockResolvedValue(fakeRecord as any)
    vi.mocked(buildCarboneData).mockReturnValue({} as any)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"success":false,"error":"invalid template"}', {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Carbone upload error')
  })

  it('devuelve 500 cuando Carbone falla en el render', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'u1' }) as any)
      .mockReturnValueOnce(makeServiceClient() as any)
    vi.mocked(fetchQuoteRecord).mockResolvedValue(fakeRecord as any)
    vi.mocked(buildCarboneData).mockReturnValue({} as any)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url === 'https://api.carbone.io/template') {
        return new Response(
          JSON.stringify({ success: true, data: { templateId: 'tmpl-123' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      // render endpoint fails
      return new Response('{"success":false,"error":"render error"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Carbone render failed')
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('devuelve 200 con url, pdf_path y expires_at en el flujo completo', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'u1' }) as any)
      .mockReturnValueOnce(makeServiceClient() as any)
    vi.mocked(fetchQuoteRecord).mockResolvedValue(fakeRecord as any)
    vi.mocked(buildCarboneData).mockReturnValue({ cliente: { nombre: 'Juan' } } as any)
    mockCarboneSuccess()

    const res = await handler(makeRequest({ quote_id: VALID_UUID }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.url).toBe('https://storage.supabase.co/quotes/signed')
    expect(body.pdf_path).toBe(`${VALID_UUID}.pdf`)
    expect(body.expires_at).toBeTruthy()
  })

  it('llama a fetchQuoteRecord con el supabase de auth y el quote_id', async () => {
    const authClient = makeAuthClient({ id: 'u1' })
    mockCreateClient
      .mockReturnValueOnce(authClient as any)
      .mockReturnValueOnce(makeServiceClient() as any)
    vi.mocked(fetchQuoteRecord).mockResolvedValue(fakeRecord as any)
    vi.mocked(buildCarboneData).mockReturnValue({} as any)
    mockCarboneSuccess()

    await handler(makeRequest({ quote_id: VALID_UUID }))

    expect(fetchQuoteRecord).toHaveBeenCalledWith(authClient, VALID_UUID)
  })
})
