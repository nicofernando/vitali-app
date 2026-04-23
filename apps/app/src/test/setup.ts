import { vi } from 'vitest'

vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    BASE_URL: '/',
  },
})

// Stub Deno globals so Edge Function index.ts files can be imported in vitest (jsdom).
// Deno.serve becomes a no-op; Deno.env.get is configured per test via (Deno as any).env.get.
vi.stubGlobal('Deno', {
  serve: vi.fn(),
  env: { get: vi.fn() },
})
