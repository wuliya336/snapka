import { defineConfig } from 'tsdown-config'

export default defineConfig({
  deps: {
    neverBundle: ['playwright-core'],
  },
  dts: {
    resolver: 'tsc',
    build: true,
  },
})
