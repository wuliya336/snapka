import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@snapka/playwright-express',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
    mockReset: true,
  },
})
