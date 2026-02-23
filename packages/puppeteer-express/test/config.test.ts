import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    search: vi.fn().mockResolvedValue(null),
  })),
}))

describe('puppeteer-express/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该返回默认配置', async () => {
    const { loadConfig } = await import('../src/config')
    const config = await loadConfig()

    expect(config.server).toBeDefined()
    expect(config.server?.port).toBe(3000)
    expect(config.server?.host).toBe('0.0.0.0')
    expect(config.server?.enableLogging).toBe(true)
    expect(config.browser).toBeDefined()
    expect(config.browser?.maxOpenPages).toBe(10)
    expect(config.browser?.pageMode).toBe('reuse')
  })

  it('应该合并用户配置与默认配置', async () => {
    const { cosmiconfig } = await import('cosmiconfig')
    vi.mocked(cosmiconfig).mockReturnValue({
      search: vi.fn().mockResolvedValue({
        config: {
          server: { port: 8080 },
          browser: { maxOpenPages: 5 },
        },
      }),
    } as any)

    const { loadConfig } = await import('../src/config')
    const config = await loadConfig()

    expect(config.server?.port).toBe(8080)
    expect(config.server?.host).toBe('0.0.0.0')
    expect(config.browser?.maxOpenPages).toBe(5)
  })
})
