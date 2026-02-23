import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@snapka/browsers',
    root: './',
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/test/**', '**/*.d.ts', '**/dist/**'],
    },
    environment: 'node',
    globals: true,
    mockReset: true,
  },
})
