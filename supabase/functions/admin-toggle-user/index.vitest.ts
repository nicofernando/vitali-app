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

function makeAdminClient(updateError: Error | null = null, profileError: Error | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ error: updateError }) } },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: profileError }),
      })),
    })),
  }
}

function makeRequest(body: unknown, auth = 'Bearer valid'): Request {
  return new Request('https://fn.supabase.co/admin-toggle-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })
}

describe('admin-toggle-user handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('OPTIONS devuelve 200 ok (CORS preflight)', async () => {
    const res = await handler(new Request('https://fn.supabase.co/admin-toggle-user', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
  })

  const ADMIN_UUID = '00000000-0000-0000-0000-000000000001'
  const USER_UUID = '00000000-0000-0000-0000-000000000002'

  it('devuelve 401 cuando no hay sesión válida', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient(null) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: true }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('No autorizado')
  })

  it('devuelve 400 cuando falta user_id', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
    const res = await handler(makeRequest({ enable: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id')
  })

  it('devuelve 400 cuando falta enable', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id y enable son requeridos')
  })

  it('devuelve 400 cuando enable es null', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: null }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id y enable son requeridos')
  })

  it('devuelve 400 cuando el admin intenta modificar su propio estado', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
    const res = await handler(makeRequest({ user_id: ADMIN_UUID, enable: false }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('propio estado')
  })

  it('devuelve 200 al deshabilitar a otro usuario (enable: false)', async () => {
    const adminClient = makeAdminClient()
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
      .mockReturnValueOnce(adminClient as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: false }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.is_active).toBe(false)
    expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      USER_UUID,
      { ban_duration: '876600h' },
    )
  })

  it('devuelve 200 al habilitar a un usuario (enable: true)', async () => {
    const adminClient = makeAdminClient()
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
      .mockReturnValueOnce(adminClient as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_active).toBe(true)
    expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      USER_UUID,
      { ban_duration: 'none' },
    )
  })

  it('devuelve 500 cuando falla la actualización en Auth', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
      .mockReturnValueOnce(makeAdminClient(new Error('Auth service error')) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: true }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('Auth service error')
  })

  it('devuelve 500 cuando falla la actualización en user_profiles', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }) as any)
      .mockReturnValueOnce(makeAdminClient(null, new Error('Profile update failed')) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: true }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('Profile update failed')
  })

  it('devuelve 403 cuando el usuario no tiene permiso', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: ADMIN_UUID }, null, false) as any)
    const res = await handler(makeRequest({ user_id: USER_UUID, enable: true }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('devuelve 400 cuando el body no es JSON válido', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient({ id: 'admin-1' }) as any)
    const req = new Request('https://fn.supabase.co/admin-toggle-user', {
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
    const res = await handler(makeRequest({ user_id: 'not-a-uuid', enable: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id inválido')
  })
})
