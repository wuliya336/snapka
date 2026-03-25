/* eslint-disable @stylistic/indent */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlaywrightCore } from '../src/core'
import type { Browser, Page, BrowserContext } from '@snapka/playwright-core'
import type { PlaywrightLaunchOptions } from '../src/launch'
import type { SnapkaScreenshotOptions, SnapkaScreenshotViewportOptions } from '@snapka/types'

describe('PlaywrightCore', () => {
  let playwrightCore: PlaywrightCore
  let mockBrowser: Browser
  let mockPage: Page
  let mockContext: BrowserContext
  let mockInitialPage: Page
  let mockOptions: PlaywrightLaunchOptions
  let mockRestartFn: () => Promise<Browser>
  let disconnectCallbacks: Array<() => void>

  beforeEach(() => {
    disconnectCallbacks = []

    // 模拟 Page
    mockPage = {
      goto: vi.fn().mockResolvedValue(null),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
      locator: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(1),
        first: vi.fn().mockReturnValue({
          screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-element-data')),
          boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 20, width: 1200, height: 2000 }),
        }),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-element-data')),
        boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 20, width: 1200, height: 2000 }),
        waitFor: vi.fn().mockResolvedValue(null),
      }),
      waitForFunction: vi.fn().mockResolvedValue(null),
      waitForRequest: vi.fn().mockResolvedValue(null),
      waitForResponse: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(null),
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(null),
      viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 800 }),
      setViewportSize: vi.fn().mockResolvedValue(null),
    } as any

    mockInitialPage = {
      close: vi.fn().mockResolvedValue(null),
    } as any

    // 模拟 BrowserContext
    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(null),
    } as any

    // 模拟 Browser
    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(null),
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'disconnected') {
          disconnectCallbacks.push(callback)
        }
      }),
      removeAllListeners: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    } as any

    mockOptions = {
      executablePath: '/path/to/chromium',
      maxOpenPages: 5,
      defaultViewport: { width: 1280, height: 720 },
    } as any

    mockRestartFn = vi.fn().mockResolvedValue(mockBrowser)

    playwrightCore = new PlaywrightCore(mockOptions, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultOptions = {} as any
      const instance = new PlaywrightCore(defaultOptions, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
      expect((instance as any).maxOpenPages).toBe(10)
    })

    it('should initialize with custom values', () => {
      const customOptions = {
        maxOpenPages: 3,
      } as any
      const instance = new PlaywrightCore(customOptions, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
      expect((instance as any).maxOpenPages).toBe(3)
    })

    it('should setup crash recovery on construction', () => {
      expect(mockBrowser.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  describe('engine', () => {
    it('should return "playwright"', () => {
      expect(playwrightCore.engine).toBe('playwright')
    })
  })

  describe('executablePath', () => {
    it('should return executablePath when available', () => {
      const options = { executablePath: '/path/to/chromium' } as any
      const instance = new PlaywrightCore(options, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
      expect(instance.executablePath()).toBe('/path/to/chromium')
    })

    it('should return null in connect mode', () => {
      const options = { baseUrl: 'ws://localhost:9222' } as any
      const instance = new PlaywrightCore(options, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
      expect(instance.executablePath()).toBe(null)
    })

    it('should return null when executablePath is undefined', () => {
      const options = {} as any
      const instance = new PlaywrightCore(options, mockBrowser, mockRestartFn, mockContext, mockInitialPage)
      expect(instance.executablePath()).toBe(null)
    })
  })

  describe('restart', () => {
    it('should restart browser instance', async () => {
      await playwrightCore.restart()

      // Soft restart: close old context and create a new one on the SAME browser
      expect(mockContext.close).toHaveBeenCalled()
      expect(mockBrowser.newContext).toHaveBeenCalled()
      // Browser process is NOT restarted
      expect((playwrightCore as any).browser).toBe(mockBrowser)
      expect(mockRestartFn).not.toHaveBeenCalled()
    })

    it('should handle context close error gracefully', async () => {
      mockContext.close = vi.fn().mockRejectedValue(new Error('Close failed'))

      await playwrightCore.restart()

      // Should still succeed and create a new context
      expect(mockBrowser.newContext).toHaveBeenCalled()
    })

    it('should set isIntentionalDisconnect during restart', async () => {
      await playwrightCore.restart()

      // After restart completes, flag should be reset
      expect((playwrightCore as any).isIntentionalDisconnect).toBe(false)
    })

    it('should setup crash recovery on new browser after restart', async () => {
      await playwrightCore.restart()

      // Browser is reused, so crash recovery listener remains on the original browser
      expect((playwrightCore as any).browser).toBe(mockBrowser)
    })
  })

  describe('close', () => {
    it('should close browser and all pages', async () => {
      await playwrightCore.close()

      expect(mockBrowser.close).toHaveBeenCalled()
    })

    it('should set isIntentionalDisconnect on close', async () => {
      await playwrightCore.close()

      expect((playwrightCore as any).isIntentionalDisconnect).toBe(true)
    })
  })

  describe('crash recovery', () => {
    it('should automatically restart on unexpected disconnect', async () => {
      const newBrowser = {
        on: vi.fn(),
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({ close: vi.fn() }),
        }),
        close: vi.fn(),
      } as any
        ; (mockRestartFn as any).mockResolvedValue(newBrowser)

      // Simulate unexpected disconnect
      for (const cb of disconnectCallbacks) {
        await cb()
      }

      expect(mockRestartFn).toHaveBeenCalled()
      expect((playwrightCore as any).browser).toBe(newBrowser)
    })

    it('should not restart on intentional disconnect', async () => {
      ; (playwrightCore as any).isIntentionalDisconnect = true

      for (const cb of disconnectCallbacks) {
        await cb()
      }

      expect(mockRestartFn).not.toHaveBeenCalled()
    })

    it('should not restart when already restarting', async () => {
      ; (playwrightCore as any).isRestarting = true

      for (const cb of disconnectCallbacks) {
        await cb()
      }

      expect(mockRestartFn).not.toHaveBeenCalled()
    })

    it('should handle restart failure gracefully', async () => {
      ; (mockRestartFn as any).mockRejectedValue(new Error('Restart failed'))

      for (const cb of disconnectCallbacks) {
        await cb()
      }

      expect((playwrightCore as any).isRestarting).toBe(false)
    })
  })

  describe('screenshot', () => {
    it('should execute screenshot with default options', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
      }

      const result = await playwrightCore.screenshot(options)
      expect(typeof result.run).toBe('function')
      expect(result.page).toBeDefined()
    })

    it('should handle fullPage screenshot', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
      }

      const result = await playwrightCore.screenshot(options)
      const imageData = await result.run()

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object))
      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ fullPage: true }))
      expect(imageData).toBeInstanceOf(Uint8Array)
    })

    it('should handle fullPage screenshot with base64 encoding', async () => {
      const options: SnapkaScreenshotOptions<'base64'> = {
        file: 'https://example.com',
        fullPage: true,
        encoding: 'base64',
      }

      const result = await playwrightCore.screenshot(options)
      const data = await result.run()

      expect(typeof data).toBe('string')
    })

    it('should handle element screenshot', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.locator).toHaveBeenCalledWith('#element')
    })

    it('should throw error when element not found', async () => {
      ; (mockPage.locator as any).mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
        first: vi.fn(),
      })

      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#nonexistent',
      }

      const result = await playwrightCore.screenshot(options)
      await expect(result.run()).rejects.toThrow('当前页面未找到任何可截图的元素')
    })

    it('should throw error when file is invalid', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 123 as any,
      }

      await expect(playwrightCore.screenshot(options))
        .rejects.toThrow('参数 file 必须是一个有效的字符串，表示要截图的页面 URL')
    })

    it('should handle type parameter - png', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'png',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ type: 'png' }))
    })

    it('should handle type parameter - jpeg', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'jpeg',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ type: 'jpeg' }))
    })

    it('should downgrade webp to png', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'webp',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ type: 'png' }))
    })

    it('should handle quality parameter for jpeg', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'jpeg',
        quality: 80,
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ quality: 80 }))
    })

    it('should strip quality for png', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'png',
        quality: 80,
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ quality: undefined }))
    })

    it('should handle omitBackground parameter', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        omitBackground: true,
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ omitBackground: true }))
    })

    it('should default omitBackground to true for png', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'png',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ omitBackground: true }))
    })

    it('should default omitBackground to false for jpeg', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        type: 'jpeg',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ omitBackground: false }))
    })

    it('should handle custom headers', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        headers: { 'X-Custom': 'value' },
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith({ 'X-Custom': 'value' })
    })

    it('should handle pageGotoParams with custom timeout', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        pageGotoParams: { timeout: 5000 },
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ timeout: 5000 }))
    })

    it('should handle pageGotoParams with waitUntil', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        pageGotoParams: { waitUntil: 'networkidle0' },
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      // networkidle0 should be converted to networkidle for playwright
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ waitUntil: 'networkidle' }))
    })

    it('should handle playwright-specific options', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        playwright: {
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          style: 'body { background: red; }',
        },
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        style: 'body { background: red; }',
      }))
    })

    it('should handle path parameter', async () => {
      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        path: '/tmp/screenshot.png',
      }

      const result = await playwrightCore.screenshot(options)
      await result.run()

      expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ path: '/tmp/screenshot.png' }))
    })

    it('should handle element screenshot with base64 encoding', async () => {
      const options: SnapkaScreenshotOptions<'base64'> = {
        file: 'https://example.com',
        selector: '#element',
        encoding: 'base64',
      }

      const mockElement = {
        screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-data')),
      }
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(mockElement),
        })

      const result = await playwrightCore.screenshot(options)
      const data = await result.run()

      expect(typeof data).toBe('string')
    })
  })

  describe('screenshotViewport', () => {
    it('should execute viewport screenshot', async () => {
      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
      }

      const result = await playwrightCore.screenshotViewport(options)
      const imageData = await result.run()

      expect(Array.isArray(imageData)).toBe(true)
      expect(imageData.length).toBeGreaterThan(0)
    })

    it('should use page.screenshot with absolute clip coordinates', async () => {
      const mockElement = {
        boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 20, width: 800, height: 2500 }),
      }
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(mockElement),
        })

      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
      }

      const result = await playwrightCore.screenshotViewport(options)
      await result.run()

      // Should use page.screenshot (not element.screenshot) with absolute coords
      expect(mockPage.screenshot).toHaveBeenCalled()
      const firstCall = (mockPage.screenshot as any).mock.calls[0][0]
      // First slice: box.x=10, box.y + 0 = 20
      expect(firstCall.clip.x).toBe(10)
      expect(firstCall.clip.y).toBe(20)
      expect(firstCall.clip.width).toBe(800)
      expect(firstCall.clip.height).toBe(1000)
    })

    it('should correctly calculate overlay for subsequent pages', async () => {
      const mockElement = {
        boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 800, height: 2500 }),
      }
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(mockElement),
        })

      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
      }

      const result = await playwrightCore.screenshotViewport(options)
      await result.run()

      // 3 slices for height 2500 with viewportHeight 1000
      expect(mockPage.screenshot).toHaveBeenCalledTimes(3)
      const calls = (mockPage.screenshot as any).mock.calls

      // First page: y=0, height=1000 (no overlap)
      expect(calls[0][0].clip).toEqual({ x: 0, y: 0, width: 800, height: 1000 })

      // Second page: y=1000-100=900, height=1000+100=1100 (overlap=100)
      expect(calls[1][0].clip).toEqual({ x: 0, y: 900, width: 800, height: 1100 })

      // Third page: y=2000-100=1900, height=500+100=600 (overlap=100, remaining=500)
      expect(calls[2][0].clip).toEqual({ x: 0, y: 1900, width: 800, height: 600 })
    })

    it('should handle viewportHeight default (2000)', async () => {
      const mockElement = {
        boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 800, height: 5000 }),
      }
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(mockElement),
        })

      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
      }

      const result = await playwrightCore.screenshotViewport(options)
      await result.run()

      // 3 slices for height 5000 with default viewportHeight 2000
      expect(mockPage.screenshot).toHaveBeenCalledTimes(3)
    })

    it('should handle base64 encoding for viewport screenshots', async () => {
      const options: SnapkaScreenshotViewportOptions<'base64'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
        encoding: 'base64',
      }

      const result = await playwrightCore.screenshotViewport(options)
      const data = await result.run()

      expect(Array.isArray(data)).toBe(true)
      for (const item of data) {
        expect(typeof item).toBe('string')
      }
    })

    it('should handle missing element', async () => {
      ; (mockPage.locator as any).mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
        first: vi.fn(),
      })

      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#missing',
      }

      const result = await playwrightCore.screenshotViewport(options)

      await expect(result.run()).rejects.toThrow('当前页面未找到任何可截图的元素')
    })

    it('should handle null bounding box', async () => {
      const mockElement = {
        boundingBox: vi.fn().mockResolvedValue(null),
      }
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(mockElement),
        })

      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
      }

      const result = await playwrightCore.screenshotViewport(options)
      const data = await result.run()

      expect(data).toEqual([])
    })

    it('should downgrade webp to png in viewport mode', async () => {
      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
        type: 'webp',
      }

      const result = await playwrightCore.screenshotViewport(options)
      await result.run()

      const firstCall = (mockPage.screenshot as any).mock.calls[0][0]
      expect(firstCall.type).toBe('png')
    })

    it('should pass playwright options in viewport mode', async () => {
      const options: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 3000,
        playwright: {
          animations: 'disabled',
          scale: 'css',
        },
      }

      const result = await playwrightCore.screenshotViewport(options)
      await result.run()

      const firstCall = (mockPage.screenshot as any).mock.calls[0][0]
      expect(firstCall.animations).toBe('disabled')
      expect(firstCall.scale).toBe('css')
    })
  })

  describe('private methods', () => {
    describe('convertWaitUntil', () => {
      it('should convert networkidle0 to networkidle', () => {
        expect((playwrightCore as any).convertWaitUntil('networkidle0')).toBe('networkidle')
      })

      it('should convert networkidle2 to networkidle', () => {
        expect((playwrightCore as any).convertWaitUntil('networkidle2')).toBe('networkidle')
      })

      it('should pass through valid values', () => {
        expect((playwrightCore as any).convertWaitUntil('load')).toBe('load')
        expect((playwrightCore as any).convertWaitUntil('domcontentloaded')).toBe('domcontentloaded')
        expect((playwrightCore as any).convertWaitUntil('commit')).toBe('commit')
      })

      it('should default to load', () => {
        expect((playwrightCore as any).convertWaitUntil()).toBe('load')
      })
    })

    describe('getPageGotoParams', () => {
      it('should return default timeout when not provided', () => {
        const result = (playwrightCore as any).getPageGotoParams()
        expect(result.timeout).toBe(30000)
      })

      it('should use provided timeout', () => {
        const result = (playwrightCore as any).getPageGotoParams({ timeout: 5000 })
        expect(result.timeout).toBe(5000)
      })

      it('should use default for zero timeout', () => {
        const result = (playwrightCore as any).getPageGotoParams({ timeout: 0 })
        expect(result.timeout).toBe(30000)
      })

      it('should use default for negative timeout', () => {
        const result = (playwrightCore as any).getPageGotoParams({ timeout: -100 })
        expect(result.timeout).toBe(30000)
      })
    })

    describe('normalizeQuality', () => {
      it('should set quality to undefined for PNG', () => {
        const options: any = { type: 'png', quality: 80 }
          ; (playwrightCore as any).normalizeQuality(options)
        expect(options.quality).toBeUndefined()
      })

      it('should keep quality for JPEG', () => {
        const options: any = { type: 'jpeg', quality: 80 }
          ; (playwrightCore as any).normalizeQuality(options)
        expect(options.quality).toBe(80)
      })

      it('should set quality to undefined when not set', () => {
        const options: any = { type: 'jpeg' }
          ; (playwrightCore as any).normalizeQuality(options)
        expect(options.quality).toBeUndefined()
      })
    })

    describe('calculatePageDimensions', () => {
      it('should calculate correct dimensions for first page', () => {
        const result = (playwrightCore as any).calculatePageDimensions(0, 1000, 3000)
        expect(result).toEqual({ y: 0, height: 1000 })
      })

      it('should calculate correct dimensions with overlap for subsequent pages', () => {
        const result = (playwrightCore as any).calculatePageDimensions(1, 1000, 3000)
        expect(result).toEqual({ y: 900, height: 1100 })
      })

      it('should handle last page correctly', () => {
        const result = (playwrightCore as any).calculatePageDimensions(2, 1000, 2500)
        expect(result).toEqual({ y: 1900, height: 600 })
      })
    })

    describe('findElement', () => {
      it('should find element with custom selector', async () => {
        const mockLocator = {
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue('element1'),
        }
          ; (mockPage.locator as any).mockReturnValue(mockLocator)

        const result = await (playwrightCore as any).findElement(mockPage, '#custom-selector')

        expect(mockPage.locator).toHaveBeenCalledWith('#custom-selector')
        expect(result).toBe('element1')
      })

      it('should fall back to default selectors', async () => {
        const bodyElement = { screenshot: vi.fn(), boundingBox: vi.fn() }
        const mockLocatorEmpty = { count: vi.fn().mockResolvedValue(0) }
        const mockLocatorFound = {
          count: vi.fn().mockResolvedValue(1),
          first: vi.fn().mockReturnValue(bodyElement),
        }
          ; (mockPage.locator as any)
            .mockReturnValueOnce(mockLocatorEmpty) // #container count check
            .mockReturnValueOnce(mockLocatorFound) // body count check
            .mockReturnValueOnce(mockLocatorFound) // body first() call

        const result = await (playwrightCore as any).findElement(mockPage)

        expect(result).toBe(bodyElement)
      })

      it('should return null when no element found', async () => {
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
        })

        const result = await (playwrightCore as any).findElement(mockPage)

        expect(result).toBe(null)
      })
    })

    describe('waitForConditions', () => {
      it('should wait for all conditions', async () => {
        const options = {
          waitForSelector: '#sel',
          waitForFunction: 'fn',
          waitForRequest: 'req',
          waitForResponse: 'res',
        } as any

        await (playwrightCore as any).waitForConditions(mockPage, options, 1000)

        expect(mockPage.waitForFunction).toHaveBeenCalled()
        expect(mockPage.waitForRequest).toHaveBeenCalled()
        expect(mockPage.waitForResponse).toHaveBeenCalled()
      })

      it('should handle array of conditions', async () => {
        const options = {
          waitForSelector: ['#sel1', '#sel2'],
        } as any

        await (playwrightCore as any).waitForConditions(mockPage, options, 1000)
      })

      it('should skip waitForSelector if element does not exist', async () => {
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
          waitFor: vi.fn(),
        })

        const options = { waitForSelector: '#sel' } as any
        await (playwrightCore as any).waitForConditions(mockPage, options, 1000)
      })
    })

    describe('retryExecute', () => {
      it('should retry on failure', async () => {
        const fn = vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValue('success')

        const result = await (playwrightCore as any).retryExecute(fn, 2, 'test')

        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(2)
      }, 15000)

      it('should throw after max retries', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'))

        await expect((playwrightCore as any).retryExecute(fn, 2, 'test'))
          .rejects.toThrow('test在 2 次尝试后仍然失败')
      }, 15000)

      it('should handle unknown error', async () => {
        const fn = vi.fn().mockRejectedValue(null)

        await expect((playwrightCore as any).retryExecute(fn, 1, 'test'))
          .rejects.toThrow('test在 1 次尝试后仍然失败: 未知错误')
      }, 15000)
    })

    describe('checkElement', () => {
      it('should return true when element exists', async () => {
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(1),
        })

        const result = await (playwrightCore as any).checkElement(mockPage, '#test')
        expect(result).toBe(true)
      })

      it('should return false when element does not exist', async () => {
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
        })

        const result = await (playwrightCore as any).checkElement(mockPage, '#test')
        expect(result).toBe(false)
      })

      it('should handle error gracefully', async () => {
        ; (mockPage.locator as any).mockReturnValue({
          count: vi.fn().mockRejectedValue(new Error('error')),
        })

        const result = await (playwrightCore as any).checkElement(mockPage, '#test')
        expect(result).toBe(false)
      })
    })

    describe('waitForResource', () => {
      it('should handle timeout without throwing', async () => {
        const waitFn = vi.fn().mockRejectedValue(new Error('Timeout'))

        await (playwrightCore as any).waitForResource(mockPage, waitFn, 'test resource', 1000)

        expect(waitFn).toHaveBeenCalled()
      })
    })
  })

  describe('page management', () => {
    it('should create new page via context', async () => {
      const page = await (playwrightCore as any).acquirePage()

      expect(mockContext.newPage).toHaveBeenCalled()
      expect((playwrightCore as any).activePages.has(page)).toBe(true)
    })

    it('should close page on release', async () => {
      const page = { close: vi.fn().mockResolvedValue(undefined) } as any
        ; (playwrightCore as any).activePages.add(page)

      await (playwrightCore as any).releasePage(page)

      expect(page.close).toHaveBeenCalled()
      expect((playwrightCore as any).activePages.has(page)).toBe(false)
    })
  })

  describe('retry parameter', () => {
    it('should respect retry count', async () => {
      let callCount = 0
        ; (mockPage.screenshot as any).mockImplementation(() => {
          callCount++
          if (callCount < 3) throw new Error('Transient error')
          return Promise.resolve(Buffer.from('success'))
        })

      const options: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
        retry: 3,
      }

      const result = await playwrightCore.screenshot(options)
      const data = await result.run()

      expect(data).toBeInstanceOf(Uint8Array)
      expect(callCount).toBe(3)
    }, 15000)
  })
})
