import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tsdown-config',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})
