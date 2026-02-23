import { describe, it, expect, vi, beforeEach } from 'vitest'
import { snapka } from '../src/index'
import { PlaywrightCore } from '../src/core'
import playwright from '@snapka/playwright-core'

// Mock dependencies
vi.mock('../src/launch', () => {
  return {
    PlaywrightLaunch: vi.fn(function () {
      return {
        getPath: vi.fn().mockResolvedValue('/path/to/browser'),
      }
    }),
  }
})

vi.mock('../src/core', () => {
  return {
    PlaywrightCore: vi.fn(function () { return {} }),
  }
})

vi.mock('@snapka/playwright-core', () => {
  return {
    default: {
      chromium: {
        launch: vi.fn(),
        connect: vi.fn(),
      },
    },
  }
})

describe('index.ts', () => {
  const mockPage = { close: vi.fn() }
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  }
  const mockBrowser = {
    close: vi.fn(),
    newContext: vi.fn().mockResolvedValue(mockContext),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    snapka.browsers.length = 0;
    (playwright.chromium.launch as any).mockResolvedValue(mockBrowser);
    (playwright.chromium.connect as any).mockResolvedValue(mockBrowser)
    mockBrowser.newContext.mockResolvedValue(mockContext)
    mockContext.newPage.mockResolvedValue(mockPage)
  })

  describe('launch', () => {
    it('should launch browser and return PlaywrightCore instance', async () => {
      const options = { headless: 'new' } as any
      await snapka.launch(options)

      expect(playwright.chromium.launch).toHaveBeenCalledWith(expect.objectContaining({
        executablePath: '/path/to/browser',
        headless: false,
      }))
      expect(PlaywrightCore).toHaveBeenCalled()
      expect(snapka.browsers).toContain(mockBrowser)
    })

    it('should handle "new" headless mode', async () => {
      const options = { headless: 'new' } as any
      await snapka.launch(options)

      expect(playwright.chromium.launch).toHaveBeenCalledWith(expect.objectContaining({
        headless: false,
      }))
    })

    it('should handle "shell" headless mode', async () => {
      const options = { headless: 'shell' } as any
      await snapka.launch(options)

      expect(playwright.chromium.launch).toHaveBeenCalledWith(expect.objectContaining({
        headless: true,
      }))
    })

    it('should throw error if executablePath is not found', async () => {
      const { PlaywrightLaunch } = await import('../src/launch');
      (PlaywrightLaunch as any).mockImplementationOnce(function () {
        return {
          getPath: vi.fn().mockResolvedValue(null),
        }
      })

      await expect(snapka.launch({} as any)).rejects.toThrow('无法获取浏览器可执行文件路径')
    })

    it('should create a restart function that updates browsers list', async () => {
      await snapka.launch({} as any)
      const restartFn = (PlaywrightCore as any).mock.calls[0][2]

      const newBrowser = { close: vi.fn(), newContext: vi.fn().mockResolvedValue(mockContext) }
        ; (playwright.chromium.launch as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(playwright.chromium.launch).toHaveBeenCalledTimes(2)
      expect(snapka.browsers).toContain(newBrowser)
      expect(snapka.browsers).not.toContain(mockBrowser)
    })

    it('should add new browser to list if old one not found during restart', async () => {
      await snapka.launch({} as any)
      const restartFn = (PlaywrightCore as any).mock.calls[0][2]

      // Manually remove browser from list to simulate it being gone
      snapka.browsers.length = 0

      const newBrowser = { close: vi.fn() }
        ; (playwright.chromium.launch as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(snapka.browsers).toContain(newBrowser)
    })
  })

  describe('connect', () => {
    it('should connect to browser and return PlaywrightCore instance', async () => {
      const options = { baseUrl: 'http://localhost:9222' } as any
      await snapka.connect(options)

      expect(playwright.chromium.connect).toHaveBeenCalledWith('http://localhost:9222', options)
      expect(PlaywrightCore).toHaveBeenCalled()
      expect(snapka.browsers).toContain(mockBrowser)
    })

    it('should pass headers and timeout options', async () => {
      const options = {
        baseUrl: 'http://localhost:9222',
        headers: { 'X-Custom': 'value' },
        timeout: 5000,
      } as any
      await snapka.connect(options)

      expect(playwright.chromium.connect).toHaveBeenCalledWith('http://localhost:9222', expect.objectContaining({
        headers: { 'X-Custom': 'value' },
        timeout: 5000,
      }))
    })

    it('should create a restart function that reconnects', async () => {
      await snapka.connect({ baseUrl: 'http://localhost:9222' } as any)
      const restartFn = (PlaywrightCore as any).mock.calls[0][2]

      const newBrowser = { close: vi.fn() }
        ; (playwright.chromium.connect as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(playwright.chromium.connect).toHaveBeenCalledTimes(2)
      expect(snapka.browsers).toContain(newBrowser)
    })

    it('should add new browser to list if old one not found during restart', async () => {
      await snapka.connect({ baseUrl: 'http://localhost:9222' } as any)
      const restartFn = (PlaywrightCore as any).mock.calls[0][2]

      // Manually remove browser from list to simulate it being gone
      snapka.browsers.length = 0

      const newBrowser = { close: vi.fn() }
        ; (playwright.chromium.connect as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(snapka.browsers).toContain(newBrowser)
    })
  })
})
