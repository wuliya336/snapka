import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@snapka/playwright-core',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})
