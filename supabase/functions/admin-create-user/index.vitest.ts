import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))
vi.mock('jsr:@supabase/supabase-js@2', () => ({ createClient: mockCreateClient }))

import { handler } from './index.ts'

function setupEnv() {
  ;(Deno as any).env.get = (key: string) =>
    ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc' }[key])
}

function makeAuthClient(user: object | null, err: object | null = null, hasPerm = true) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: err }) },
    rpc: vi.fn().mockResolvedValue({ data: hasPerm, error: null }),
  }
}

function makeAdminClient(inviteResult: object) {
  return {
    auth: { admin: { inviteUserByEmail: vi.fn().mockResolvedValue(inviteResult) } },
    from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
  }
}

function makeRequest(body: unknown, auth = 'Bearer valid'): Request {
  return new Request('https://fn.supabase.co/admin-create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })
}

describe('admin-create-user handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('OPTIONS devuelve 200 ok (CORS preflight)', async () => {
    const res = await handler(new Request('https://fn.supabase.co/admin-create-user', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
  })

  it('devuelve 401 cuando el token es inválido', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient(null, { message: 'bad token' }) as any)
    const res = await handler(makeRequest({ email: 'a@b.com' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('No autorizado')
  })

  it('devuelve 400 cuando falta email', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('email')
  })

  it('devuelve 201 con id y email al crear usuario exitosamente', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient({ data: { user: { id: 'new-user-1' } }, error: null }) as any)
    const res = await handler(makeRequest({ email: 'nuevo@vitali.com', full_name: 'Nuevo Usuario' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-user-1')
    expect(body.email).toBe('nuevo@vitali.com')
  })

  it('actualiza el phone en user_profiles si se provee', async () => {
    const adminClient = makeAdminClient({ data: { user: { id: 'new-user-1' } }, error: null })
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(adminClient as any)

    await handler(makeRequest({ email: 'nuevo@vitali.com', phone: '+56912345678' }))

    expect(adminClient.from).toHaveBeenCalledWith('user_profiles')
  })

  it('devuelve 500 cuando la API de Supabase falla al invitar', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient({ data: null, error: new Error('Email ya existe') }) as any)
    const res = await handler(makeRequest({ email: 'existe@vitali.com' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('Email ya existe')
  })

  it('devuelve 403 cuando el usuario no tiene permiso', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }, null, false) as any)
    const res = await handler(makeRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('devuelve 400 cuando el body no es JSON válido', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient({ id: 'admin-1' }) as any)
    const req = new Request('https://fn.supabase.co/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid' },
      body: 'not-json',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('devuelve 400 cuando el email es inválido', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
    const res = await handler(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Email inválido')
  })
})
