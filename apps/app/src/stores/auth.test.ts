import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth'

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
  },
}))

const mockUser = { id: 'user-1', email: 'test@vitalisuites.com' }
const mockSession = { user: mockUser, access_token: 'token-123' }

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('comienza sin sesión', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('login exitoso actualiza user y session', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: mockUser as any, session: mockSession as any },
      error: null,
    })

    const store = useAuthStore()
    await store.login('test@vitalisuites.com', 'password')

    expect(store.user).toEqual(mockUser)
    expect(store.session).toEqual(mockSession)
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

    const store = useAuthStore()
    const loginPromise = store.login('test@vitalisuites.com', 'password')

    expect(store.loading).toBe(true)

    resolveLogin({ data: { user: mockUser, session: mockSession }, error: null })
    await loginPromise

    expect(store.loading).toBe(false)
  })

  it('logout limpia user y session', async () => {
    const store = useAuthStore()
    store.user = mockUser as any
    store.session = mockSession as any

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('initialize carga la sesión existente', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
    } as any)

    const store = useAuthStore()
    await store.initialize()

    expect(store.session).toEqual(mockSession)
    expect(store.user).toEqual(mockUser)
  })
})
