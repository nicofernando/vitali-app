import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTypologiesStore } from './typologies'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('useTypologiesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia vacío', () => {
    const store = useTypologiesStore()
    expect(store.typologies).toEqual([])
  })

  it('fetchAll carga todas las tipologías', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fakeTypologies = [{ id: 'ty1', name: '2D', surface_m2: 65 }]
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: fakeTypologies, error: null }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchAll()

    expect(store.typologies).toEqual(fakeTypologies)
  })

  it('create agrega tipología al inicio de la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const newTypo = { id: 'ty2', name: '3D', surface_m2: 85, description: null, created_at: '' }
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newTypo, error: null }),
        }),
      }),
    } as any)

    const store = useTypologiesStore()
    const result = await store.create({ name: '3D', surface_m2: 85, description: null })

    expect(result).toEqual(newTypo)
    expect(store.typologies[0]).toEqual(newTypo)
  })

  it('fetchAll guarda el error si supabase falla', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      }),
    } as any)

    const store = useTypologiesStore()
    await store.fetchAll()

    expect(store.error).toBe('Error')
  })
})
