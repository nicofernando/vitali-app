import { FunctionsHttpError } from '@supabase/supabase-js'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentTemplatesStore } from './documentTemplates'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  FunctionsHttpError: class extends Error {
    context: any
    constructor(message: string, context: any) {
      super(message)
      this.context = context
    }
  },
}))

const baseTemplate = {
  id: 'tpl1',
  name: 'Contrato de reserva',
  description: null,
  storage_path: 'templates/tpl1.docx',
  context_needs: ['cliente'],
  is_active: true,
  version: 1,
  created_by: 'user1',
  created_at: '2026-04-25T00:00:00Z',
  updated_at: '2026-04-25T00:00:00Z',
}

describe('useDocumentTemplatesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('new-uuid') })
  })

  // ── Estado inicial ────────────────────────────────────────────
  it('inicia con lista vacía, sin loading ni error', () => {
    const store = useDocumentTemplatesStore()
    expect(store.templates).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.hasFetched).toBe(false)
  })

  // ── fetchAll ──────────────────────────────────────────────────
  it('fetchAll: carga templates y marca hasFetched', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [baseTemplate], error: null }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    await store.fetchAll()

    expect(store.templates).toEqual([baseTemplate])
    expect(store.hasFetched).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchAll: segunda llamada no ejecuta la query (cache hasFetched)', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [baseTemplate], error: null }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    await store.fetchAll()
    await store.fetchAll()

    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('fetchAll: si falla, guarda error y lista queda vacía', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Sin acceso' } }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    await store.fetchAll()

    expect(store.templates).toEqual([])
    expect(store.error).toBe('Sin acceso')
    expect(store.hasFetched).toBe(false)
  })

  // ── create ────────────────────────────────────────────────────
  it('create: sube el archivo al storage, inserta en DB y refresca la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    const file = new File(['content'], 'contrato.docx')

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    } as any)

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: baseTemplate, error: null }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [baseTemplate], error: null }),
        }),
      } as any)

    const store = useDocumentTemplatesStore()
    const result = await store.create({ name: 'Contrato de reserva', description: null, context_needs: ['cliente'], file })

    expect(supabase.storage.from).toHaveBeenCalledWith('templates')
    expect(result).toEqual(baseTemplate)
    expect(store.hasFetched).toBe(true)
  })

  it('create: usa el mismo UUID para el id y el storage_path', async () => {
    const { supabase } = await import('@/lib/supabase')
    const file = new File(['content'], 'test.docx')
    let capturedInsert: any = null

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    } as any)

    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data) => {
          capturedInsert = data
          return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: baseTemplate, error: null }) }) }
        }),
      } as any)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [baseTemplate], error: null }),
        }),
      } as any)

    await useDocumentTemplatesStore().create({ name: 'X', description: null, context_needs: [], file })

    expect(capturedInsert.id).toBe('new-uuid')
    expect(capturedInsert.storage_path).toBe('templates/new-uuid.docx')
  })

  it('create: si falla el storage, no inserta en DB y guarda error', async () => {
    const { supabase } = await import('@/lib/supabase')
    const file = new File(['content'], 'contrato.docx')

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: 'Bucket lleno' } }),
    } as any)

    const store = useDocumentTemplatesStore()
    const result = await store.create({ name: 'Test', description: null, context_needs: [], file })

    expect(result).toBeNull()
    expect(store.error).toBe('Bucket lleno')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('create: si falla la DB, guarda error y retorna null', async () => {
    const { supabase } = await import('@/lib/supabase')
    const file = new File(['content'], 'contrato.docx')

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    } as any)

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Nombre duplicado' } }),
        }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    const result = await store.create({ name: 'Dup', description: null, context_needs: [], file })

    expect(result).toBeNull()
    expect(store.error).toBe('Nombre duplicado')
  })

  // ── toggleActive ──────────────────────────────────────────────
  it('toggleActive: invierte is_active en memoria sin refetch', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    store.templates = [{ ...baseTemplate, is_active: true }]
    await store.toggleActive('tpl1')

    expect(store.templates[0].is_active).toBe(false)
    expect(store.error).toBeNull()
  })

  it('toggleActive: doble llamada restaura el estado original', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    store.templates = [{ ...baseTemplate, is_active: true }]
    await store.toggleActive('tpl1')
    await store.toggleActive('tpl1')

    expect(store.templates[0].is_active).toBe(true)
  })

  it('toggleActive: si el template no existe, no llama a la DB', async () => {
    const { supabase } = await import('@/lib/supabase')
    const store = useDocumentTemplatesStore()
    store.templates = []
    await store.toggleActive('ghost-id')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('toggleActive: si falla la DB, guarda error y no modifica is_active', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    store.templates = [{ ...baseTemplate, is_active: true }]
    await store.toggleActive('tpl1')

    expect(store.templates[0].is_active).toBe(true)
    expect(store.error).toBe('RLS violation')
  })

  // ── remove ────────────────────────────────────────────────────
  it('remove: elimina el archivo del storage y el registro de la DB', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    } as any)
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    store.templates = [{ ...baseTemplate }]
    await store.remove('tpl1')

    expect(supabase.storage.from).toHaveBeenCalledWith('templates')
    expect(store.templates).toHaveLength(0)
  })

  it('remove: si falla la DB, guarda error y el template queda en la lista', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    } as any)
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'FK constraint' } }),
      }),
    } as any)

    const store = useDocumentTemplatesStore()
    store.templates = [{ ...baseTemplate }]
    await store.remove('tpl1')

    expect(store.templates).toHaveLength(1)
    expect(store.error).toBe('FK constraint')
  })

  // ── generateTest ──────────────────────────────────────────────
  it('generateTest: retorna la URL del PDF generado', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://storage.example.com/test.pdf' },
      error: null,
    } as any)

    const store = useDocumentTemplatesStore()
    const url = await store.generateTest('tpl1', { quote_id: 'q1' })

    expect(url).toBe('https://storage.example.com/test.pdf')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-document', {
      body: { template_id: 'tpl1', context: { quote_id: 'q1' } },
    })
  })

  it('generateTest: si hay error genérico, guarda error y retorna null', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'EF caída' },
    } as any)

    const store = useDocumentTemplatesStore()
    const url = await store.generateTest('tpl1', {})

    expect(url).toBeNull()
    expect(store.error).toBeTruthy()
  })

  it('generateTest: FunctionsHttpError extrae el mensaje del body JSON', async () => {
    const { supabase } = await import('@/lib/supabase')
    const httpErr = new FunctionsHttpError('HTTP error', {
      json: vi.fn().mockResolvedValue({ error: 'Template no encontrado' }),
    })
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpErr,
    } as any)

    const store = useDocumentTemplatesStore()
    const url = await store.generateTest('tpl1', {})

    expect(url).toBeNull()
    expect(store.error).toBe('Template no encontrado')
  })

  it('generateTest: FunctionsHttpError con body inválido usa el mensaje del error', async () => {
    const { supabase } = await import('@/lib/supabase')
    const httpErr = new FunctionsHttpError('Error genérico EF', {
      json: vi.fn().mockRejectedValue(new Error('Not JSON')),
    })
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: httpErr,
    } as any)

    const store = useDocumentTemplatesStore()
    const url = await store.generateTest('tpl1', {})

    expect(url).toBeNull()
    expect(store.error).toBe('Error genérico EF')
  })
})
