import { describe, it, expect } from 'vitest'

/**
 * @snapka/playwright-core 是 playwright-core 的 re-export 包
 * 测试确保所有核心导出均可用
 */
describe('@snapka/playwright-core', () => {
  it('应该能正常导入模块', async () => {
    const mod = await import('../src/index')
    expect(mod).toBeDefined()
  })

  it('应该导出 default', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeDefined()
  })

  it('应该导出 chromium', async () => {
    const mod = await import('../src/index')
    expect(mod.default.chromium).toBeDefined()
  })

  it('应该导出 firefox', async () => {
    const mod = await import('../src/index')
    expect(mod.default.firefox).toBeDefined()
  })

  it('应该导出 webkit', async () => {
    const mod = await import('../src/index')
    expect(mod.default.webkit).toBeDefined()
  })
})
