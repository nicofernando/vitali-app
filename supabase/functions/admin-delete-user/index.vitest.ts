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

function makeAdminClient(deleteError: Error | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: deleteError }) } },
  }
}

function makeRequest(body: unknown, auth = 'Bearer valid'): Request {
  return new Request('https://fn.supabase.co/admin-delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })
}

describe('admin-delete-user handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('OPTIONS devuelve 200 ok (CORS preflight)', async () => {
    const res = await handler(new Request('https://fn.supabase.co/admin-delete-user', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
  })

  it('devuelve 401 cuando no hay sesión válida', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient(null) as any)
    const res = await handler(makeRequest({ user_id: 'other-user' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('No autorizado')
  })

  it('devuelve 400 cuando falta user_id', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id')
  })

  it('devuelve 400 cuando el usuario intenta eliminarse a sí mismo', async () => {
    const adminUuid = '00000000-0000-0000-0000-000000000001'
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: adminUuid }) as any)
    const res = await handler(makeRequest({ user_id: adminUuid }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('eliminarte')
  })

  it('devuelve 200 ok al eliminar otro usuario', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: '00000000-0000-0000-0000-000000000001' }) as any)
      .mockReturnValueOnce(makeAdminClient() as any)
    const res = await handler(makeRequest({ user_id: '00000000-0000-0000-0000-000000000002' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('devuelve 500 cuando Supabase falla al eliminar', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: '00000000-0000-0000-0000-000000000001' }) as any)
      .mockReturnValueOnce(makeAdminClient(new Error('User not found')) as any)
    const res = await handler(makeRequest({ user_id: '00000000-0000-0000-0000-000000000002' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('User not found')
  })

  it('devuelve 403 cuando el usuario no tiene permiso', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }, null, false) as any)
    const res = await handler(makeRequest({ user_id: 'other-user' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('devuelve 400 cuando el body no es JSON válido', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient({ id: 'admin-1' }) as any)
    const req = new Request('https://fn.supabase.co/admin-delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid' },
      body: 'not-json',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Body JSON inválido')
  })

  it('devuelve 400 cuando user_id no es UUID válido', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
    const res = await handler(makeRequest({ user_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id inválido')
  })
})
