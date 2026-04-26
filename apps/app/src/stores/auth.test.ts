import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth'

const mockProfile = {
  id: 'p1',
  user_id: 'user-1',
  full_name: 'Test User',
  phone: null,
  created_at: '2026-01-01T00:00:00Z',
}

const mockUser = { id: 'user-1', email: 'test@vitalisuites.com' }
const mockSession = { user: mockUser, access_token: 'token-123' }

function mockFrom(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue(mockFrom(null)),
  },
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ── Estado inicial ─────────────────────────────────────────────
  it('comienza sin sesión ni perfil', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  // ── initialize ─────────────────────────────────────────────────
  it('initialize: carga sesión y perfil cuando hay sesión', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
    } as any)
    vi.mocked(supabase.from).mockReturnValue(mockFrom(mockProfile) as any)

    const store = useAuthStore()
    await store.initialize()

    expect(store.session).toEqual(mockSession)
    expect(store.user).toEqual(mockUser)
    expect(store.profile?.full_name).toBe('Test User')
  })

  it('initialize: sin sesión no carga perfil', async () => {
    const store = useAuthStore()
    await store.initialize()

    expect(store.user).toBeNull()
    expect(store.profile).toBeNull()
  })

  it('initialize: perfil queda null si fetchProfile devuelve error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
    } as any)
    vi.mocked(supabase.from).mockReturnValue(
      mockFrom(null, { message: 'not found' }) as any,
    )

    const store = useAuthStore()
    await store.initialize()

    expect(store.user).toEqual(mockUser)
    expect(store.profile).toBeNull()
  })

  // ── login ──────────────────────────────────────────────────────
  it('login exitoso actualiza user, session y perfil', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: mockUser as any, session: mockSession as any },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue(mockFrom(mockProfile) as any)

    const store = useAuthStore()
    await store.login('test@vitalisuites.com', 'password')

    expect(store.user).toEqual(mockUser)
    expect(store.session).toEqual(mockSession)
    expect(store.profile?.full_name).toBe('Test User')
    expect(store.isAuthenticated).toBe(true)
    expect(store.error).toBeNull()
  })

  it('login fallido guarda error y relanza', async () => {
    const { supabase } = await import('@/lib/supabase')
    const authError = new Error('Invalid login credentials')
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: authError as any,
    })

    const store = useAuthStore()
    await expect(store.login('bad@email.com', 'wrong')).rejects.toThrow('Invalid login credentials')
    expect(store.error).toBe('Invalid login credentials')
    expect(store.isAuthenticated).toBe(false)
    expect(store.loading).toBe(false)
  })

  it('loading es true durante el login y false al terminar', async () => {
    const { supabase } = await import('@/lib/supabase')
    let resolveLogin!: (v: any) => void
    vi.mocked(supabase.auth.signInWithPassword).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    vi.mocked(supabase.from).mockReturnValue(mockFrom(null) as any)

    const store = useAuthStore()
    const loginPromise = store.login('test@vitalisuites.com', 'password')

    expect(store.loading).toBe(true)

    resolveLogin({ data: { user: mockUser, session: mockSession }, error: null })
    await loginPromise

    expect(store.loading).toBe(false)
  })

  // ── logout ─────────────────────────────────────────────────────
  it('logout limpia user, session y perfil', async () => {
    const store = useAuthStore()
    store.user = mockUser as any
    store.session = mockSession as any
    store.profile = mockProfile as any

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
