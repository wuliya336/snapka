import { describe, it, expect } from 'vitest'

/**
 * @snapka/puppeteer-core 是 puppeteer-core 的 re-export 包
 * 测试确保所有核心导出均可用
 */
describe('@snapka/puppeteer-core', () => {
  it('应该能正常导入模块', async () => {
    const mod = await import('../src/index')
    expect(mod).toBeDefined()
  })

  it('应该导出 default', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeDefined()
  })

  it('应该导出 launch 方法', async () => {
    const mod = await import('../src/index')
    expect(mod.default.launch).toBeTypeOf('function')
  })

  it('应该导出 connect 方法', async () => {
    const mod = await import('../src/index')
    expect(mod.default.connect).toBeTypeOf('function')
  })
})
