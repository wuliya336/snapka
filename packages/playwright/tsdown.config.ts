import { defineConfig } from 'tsdown-config'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/playwright-core.ts',
    './src/snapka-browser-finder.ts',
  ],
  deps: {
    neverBundle: ['playwright-core'],
  },
  dts: true,
})
