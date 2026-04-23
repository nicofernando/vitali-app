import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.test.ts',
      '../../supabase/functions/**/*.vitest.ts',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Map Deno JSR imports to the installed npm package (absolute path so vitest
      // can resolve it regardless of where the test file lives in the monorepo).
      'jsr:@supabase/supabase-js@2': fileURLToPath(new URL('./node_modules/@supabase/supabase-js', import.meta.url)),
    },
  },
})
