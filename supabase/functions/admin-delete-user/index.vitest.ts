import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }))
vi.mock('jsr:@supabase/supabase-js@2', () => ({ createClient: mockCreateClient }))

import { handler } from './index.ts'

function setupEnv() {
  ;(Deno as any).env.get = (key: string) =>
    ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc' }[key])
}

function makeAuthClient(user: object | null, err: object | null = null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: err }) } }
}

function makeAdminClient(deleteError: Error | null = null) {
  return { auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: deleteError }) } } }
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

  it('OPTIONS devuelve 200 ok (CORS preflight)', async () => {
    const res = await handler(new Request('https://fn.supabase.co/admin-delete-user', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
  })

  it('devuelve 401 cuando no hay sesión válida', async () => {
    mockCreateClient.mockReturnValue(makeAuthClient(null) as any)
    const res = await handler(makeRequest({ user_id: 'other-user' }))
    expect(res.status).toBe(401)
  })

  it('devuelve 400 cuando falta user_id', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient() as any)
    const res = await handler(makeRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('user_id')
  })

  it('devuelve 400 cuando el usuario intenta eliminarse a sí mismo', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient() as any)
    const res = await handler(makeRequest({ user_id: 'admin-1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('eliminarte')
  })

  it('devuelve 200 ok al eliminar otro usuario', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient() as any)
    const res = await handler(makeRequest({ user_id: 'other-user' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('devuelve 500 cuando Supabase falla al eliminar', async () => {
    mockCreateClient
      .mockReturnValueOnce(makeAuthClient({ id: 'admin-1' }) as any)
      .mockReturnValueOnce(makeAdminClient(new Error('User not found')) as any)
    const res = await handler(makeRequest({ user_id: 'other-user' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('User not found')
  })
})
