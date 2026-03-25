import { describe, it, expect, vi, beforeEach } from 'vitest'
import { snapka } from '../src/index'
import { PuppeteerCore } from '../src/core'
import puppeteer from 'puppeteer-core'

// Mock dependencies
vi.mock('../src/launch', () => {
  return {
    SnapkaLaunch: vi.fn(function () {
      return {
        getPath: vi.fn().mockResolvedValue('/path/to/browser'),
      }
    }),
  }
})

vi.mock('../src/core', () => {
  return {
    PuppeteerCore: vi.fn(function () { return {} }),
  }
})

vi.mock('puppeteer-core', () => {
  return {
    default: {
      launch: vi.fn(),
      connect: vi.fn(),
    },
  }
})

describe('index.ts', () => {
  const mockBrowser = {
    close: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    snapka.browsers.length = 0;
    (puppeteer.launch as any).mockResolvedValue(mockBrowser);
    (puppeteer.connect as any).mockResolvedValue(mockBrowser)
  })

  describe('launch', () => {
    it('should launch browser and return PuppeteerCore instance', async () => {
      const options = { headless: 'new' } as any
      await snapka.launch(options)

      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        executablePath: '/path/to/browser',
        headless: true,
      }))
      expect(PuppeteerCore).toHaveBeenCalled()
      expect(snapka.browsers).toContain(mockBrowser)
    })

    it('should handle "new" headless mode', async () => {
      const options = { headless: 'new' } as any
      await snapka.launch(options)

      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        headless: true,
      }))
    })

    it('should handle "shell" headless mode', async () => {
      const options = { headless: 'shell' } as any
      await snapka.launch(options)

      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        headless: 'shell',
      }))
    })

    it('should throw error if executablePath is not found', async () => {
      const { SnapkaLaunch } = await import('../src/launch');
      (SnapkaLaunch as any).mockImplementationOnce(function () {
        return {
          getPath: vi.fn().mockResolvedValue(null),
        }
      })

      await expect(snapka.launch({} as any)).rejects.toThrow('无法获取浏览器可执行文件路径')
    })

    it('should create a restart function that updates browsers list', async () => {
      await snapka.launch({} as any)
      const restartFn = (PuppeteerCore as any).mock.calls[0][2]

      const newBrowser = { close: vi.fn() }
        ; (puppeteer.launch as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(puppeteer.launch).toHaveBeenCalledTimes(2)
      expect(snapka.browsers).toContain(newBrowser)
      expect(snapka.browsers).not.toContain(mockBrowser)
    })

    it('should add new browser to list if old one not found during restart', async () => {
      await snapka.launch({} as any)
      const restartFn = (PuppeteerCore as any).mock.calls[0][2]

      // Manually remove browser from list to simulate it being gone
      snapka.browsers.length = 0

      const newBrowser = { close: vi.fn() }
        ; (puppeteer.launch as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(snapka.browsers).toContain(newBrowser)
    })
  })

  describe('connect', () => {
    it('should connect to browser and return PuppeteerCore instance', async () => {
      const options = { browserURL: 'http://localhost:9222' } as any
      await snapka.connect(options)

      expect(puppeteer.connect).toHaveBeenCalledWith(expect.objectContaining({
        browserURL: 'http://localhost:9222',
      }))
      expect(PuppeteerCore).toHaveBeenCalled()
      expect(snapka.browsers).toContain(mockBrowser)
    })

    it('should use baseUrl as browserURL', async () => {
      const options = { baseUrl: 'http://localhost:9222' } as any
      await snapka.connect(options)

      expect(puppeteer.connect).toHaveBeenCalledWith(expect.objectContaining({
        browserURL: 'http://localhost:9222',
      }))
    })

    it('should create a restart function that reconnects', async () => {
      await snapka.connect({} as any)
      const restartFn = (PuppeteerCore as any).mock.calls[0][2]

      const newBrowser = { close: vi.fn() }
        ; (puppeteer.connect as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(puppeteer.connect).toHaveBeenCalledTimes(2)
      expect(snapka.browsers).toContain(newBrowser)
    })

    it('should add new browser to list if old one not found during restart', async () => {
      await snapka.connect({} as any)
      const restartFn = (PuppeteerCore as any).mock.calls[0][2]

      // Manually remove browser from list to simulate it being gone
      snapka.browsers.length = 0

      const newBrowser = { close: vi.fn() }
        ; (puppeteer.connect as any).mockResolvedValueOnce(newBrowser)

      await restartFn()

      expect(snapka.browsers).toContain(newBrowser)
    })
  })
})
