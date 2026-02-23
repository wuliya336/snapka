import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@snapka/types',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})
