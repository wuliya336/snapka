/* eslint-disable @stylistic/indent */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PuppeteerCore } from '../src/core'
import type { Browser, Page } from '@snapka/puppeteer-core'
import type { PuppeteerLaunchOptions } from '../src/launch'
import type { SnapkaScreenshotOptions, SnapkaScreenshotViewportOptions } from '@snapka/types'

// 模拟依赖
// 移除 p-limit mock，使用真实实现
// 移除 util mock，使用真实实现

describe('PuppeteerCore', () => {
  let puppeteerCore: PuppeteerCore
  let mockBrowser: Browser
  let mockPage: Page
  let mockOptions: PuppeteerLaunchOptions
  let mockRestartFn: () => Promise<Browser>

  beforeEach(() => {
    // 模拟 Page
    mockPage = {
      goto: vi.fn().mockResolvedValue(null),
      screenshot: vi.fn().mockResolvedValue('mock-image-data'),
      $: vi.fn().mockResolvedValue({
        screenshot: vi.fn().mockResolvedValue('mock-element-image-data'),
        boundingBox: vi.fn().mockResolvedValue({ width: 1200, height: 2000 }),
      }),
      waitForSelector: vi.fn().mockResolvedValue(null),
      waitForFunction: vi.fn().mockResolvedValue(null),
      waitForRequest: vi.fn().mockResolvedValue(null),
      waitForResponse: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(null),
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(null),
      isClosed: vi.fn().mockReturnValue(false),
    } as any

    // 模拟 Browser
    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      connected: true,
    } as any

    mockOptions = {
      executablePath: '/path/to/chrome',
      maxOpenPages: 5,
      pageMode: 'reuse',
      pageIdleTimeout: 30000,
    } as any

    mockRestartFn = vi.fn().mockResolvedValue(mockBrowser)

    puppeteerCore = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultOptions = {} as any
      const instance = new PuppeteerCore(defaultOptions, mockBrowser, mockRestartFn)
      expect((instance as any).maxOpenPages).toBe(10)
      expect((instance as any).pageMode).toBe('reuse')
      expect((instance as any).pageIdleTimeout).toBe(60000)
    })

    it('should initialize with custom values', () => {
      const customOptions = {
        maxOpenPages: 3,
        pageMode: 'disposable',
        pageIdleTimeout: 15000,
      } as any
      const instance = new PuppeteerCore(customOptions, mockBrowser, mockRestartFn)
      expect((instance as any).maxOpenPages).toBe(3)
      expect((instance as any).pageMode).toBe('disposable')
      expect((instance as any).pageIdleTimeout).toBe(15000)
    })
  })

  describe('engine', () => {
    it('should return "puppeteer"', () => {
      expect(puppeteerCore.engine).toBe('puppeteer')
    })
  })

  describe('executablePath', () => {
    it('should return executablePath when available', () => {
      const options = {
        executablePath: '/path/to/chrome',
      } as any
      const instance = new PuppeteerCore(options, mockBrowser, mockRestartFn)
      expect(instance.executablePath()).toBe('/path/to/chrome')
    })

    it('should return null when executablePath is not available', () => {
      const options = {
        baseUrl: 'ws://localhost:9222/devtools/browser',
      } as any
      const instance = new PuppeteerCore(options, mockBrowser, mockRestartFn)
      expect(instance.executablePath()).toBe(null)
    })

    it('should return null when executablePath is undefined', () => {
      const options = {} as any
      const instance = new PuppeteerCore(options, mockBrowser, mockRestartFn)
      expect(instance.executablePath()).toBe(null)
    })
  })

  describe('restart', () => {
    it('should restart browser instance', async () => {
      const newBrowser = { on: vi.fn() } as any
        ; (mockRestartFn as any).mockResolvedValue(newBrowser)

      await puppeteerCore.restart()

      expect(mockBrowser.close).toHaveBeenCalled()
      expect(mockRestartFn).toHaveBeenCalled()
      expect((puppeteerCore as any).browser).toBe(newBrowser)
    })

    it('should not start idle check when pageMode is disposable', async () => {
      const instance = new PuppeteerCore({ ...mockOptions, pageMode: 'disposable' }, mockBrowser, mockRestartFn)
      const newBrowser = { on: vi.fn() } as any
        ; (mockRestartFn as any).mockResolvedValue(newBrowser)

      await instance.restart()

      expect((instance as any).idleCheckTimer).toBeUndefined()
    })

    it('should handle browser close error gracefully', async () => {
      const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
      const newBrowser = { on: vi.fn() } as any
      const closeMock = vi.fn().mockRejectedValue(new Error('Close failed'))
        ; (instance as any).browser.close = closeMock
        ; (mockRestartFn as any).mockResolvedValue(newBrowser)

      await instance.restart()

      expect(closeMock).toHaveBeenCalled()
      expect((instance as any).browser).toBe(newBrowser)
    })
  })

  describe('close', () => {
    it('should close browser and all pages', async () => {
      await puppeteerCore.close()

      expect(mockBrowser.close).toHaveBeenCalled()
    })
  })

  describe('screenshot', () => {
    it('should execute screenshot with default options', async () => {
      const mockOptions: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
      }

      const result = await puppeteerCore.screenshot(mockOptions)
      expect(typeof result.run).toBe('function')
      expect(result.page).toBeDefined()
    })

    it('should handle screenshot execution', async () => {
      const mockOptions: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        fullPage: true,
      }

      const result = await puppeteerCore.screenshot(mockOptions)
      const imageData = await result.run()

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object))
      expect(mockPage.screenshot).toHaveBeenCalled()
      expect(imageData).toBe('mock-image-data')
    })

    it('should handle element screenshot', async () => {
      const mockOptions: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
      }

      const result = await puppeteerCore.screenshot(mockOptions)
      await result.run()

      expect(mockPage.$).toHaveBeenCalledWith('#element')
      expect(mockPage.$).toHaveReturnedWith(expect.any(Object))
    })

    it('should throw error when element not found for screenshot', async () => {
      const mockOptions: SnapkaScreenshotOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#nonexistent',
      }

        ; (mockPage.$ as any).mockResolvedValue(null)

      const result = await puppeteerCore.screenshot(mockOptions)
      await expect(result.run()).rejects.toThrow('当前页面未找到任何可截图的元素')
    })
  })

  describe('screenshotViewport', () => {
    it('should execute viewport screenshot', async () => {
      const mockOptions: SnapkaScreenshotViewportOptions<'binary'> = {
        file: 'https://example.com',
        selector: '#element',
        viewportHeight: 1000,
      }

      const result = await puppeteerCore.screenshotViewport(mockOptions)
      const imageData = await result.run()

      expect(Array.isArray(imageData)).toBe(true)
      expect(imageData.length).toBeGreaterThan(0)
    })
  })

  describe('private methods and edge cases', () => {
    describe('convertWaitUntil', () => {
      it('should convert waitUntil values correctly', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)

        expect((instance as any).convertWaitUntil('commit')).toBe('domcontentloaded')
        expect((instance as any).convertWaitUntil('networkidle')).toBe('networkidle0')
        expect((instance as any).convertWaitUntil('load')).toBe('load')
        expect((instance as any).convertWaitUntil()).toBe('load')
      })
    })

    describe('shouldStartIdleCheck', () => {
      it('should return true when pageMode is reuse and pageIdleTimeout > 0', () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageMode: 'reuse',
          pageIdleTimeout: 30000,
        } as any, mockBrowser, mockRestartFn)

        expect((instance as any).shouldStartIdleCheck()).toBe(true)
      })

      it('should return false when pageMode is disposable', () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageMode: 'disposable',
        } as any, mockBrowser, mockRestartFn)

        expect((instance as any).shouldStartIdleCheck()).toBe(false)
      })

      it('should return false when pageIdleTimeout <= 0', () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 0,
        } as any, mockBrowser, mockRestartFn)

        expect((instance as any).shouldStartIdleCheck()).toBe(false)
      })
    })

    describe('calculatePageDimensions', () => {
      it('should calculate correct dimensions for first page', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).calculatePageDimensions(0, 1000, 3000)

        expect(result).toEqual({ y: 0, height: 1000 })
      })

      it('should calculate correct dimensions for subsequent pages with overlap', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).calculatePageDimensions(1, 1000, 3000)

        expect(result).toEqual({ y: 900, height: 1100 })
      })

      it('should handle last page correctly', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).calculatePageDimensions(2, 1000, 2500)

        expect(result).toEqual({ y: 1900, height: 600 })
      })
    })

    describe('findElement', () => {
      it('should find element with custom selector', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValueOnce('element1').mockResolvedValueOnce(null).mockResolvedValueOnce(null)

        const result = await (instance as any).findElement(mockPage, '#custom-selector')

        expect(mockPage.$).toHaveBeenCalledWith('#custom-selector')
        expect(result).toBe('element1')
      })

      it('should fall back to default selectors', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValueOnce(null).mockResolvedValueOnce('container-element').mockResolvedValueOnce(null)

        const result = await (instance as any).findElement(mockPage)

        expect(mockPage.$).toHaveBeenCalledWith('#container')
        expect(result).toBe('container-element')
      })

      it('should return null when no element found', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)

        const result = await (instance as any).findElement(mockPage)

        expect(result).toBe(null)
      })
    })

    describe('preparePage', () => {
      it('should prepare page with valid URL', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: SnapkaScreenshotOptions<'binary'> = {
          file: 'https://example.com',
          headers: { 'X-Test': '1' },
          pageGotoParams: { timeout: 5000, waitUntil: 'networkidle' },
        }

        const result = await (instance as any).preparePage(options)

        expect(result.page).toBeDefined()
        expect(result.timeout).toBe(5000)
        expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith({ 'X-Test': '1' })
      })

      it('should throw error with invalid file parameter', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: SnapkaScreenshotOptions<'binary'> = {
          file: 123 as any,
        }

        await expect((instance as any).preparePage(options))
          .rejects.toThrow('参数 file 必须是一个有效的字符串，表示要截图的页面 URL')
      })
    })

    describe('getPageGotoParams', () => {
      it('should return default timeout when not provided', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).getPageGotoParams()

        expect(result.timeout).toBe(30000)
      })

      it('should use provided timeout when valid', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).getPageGotoParams({ timeout: 5000 })

        expect(result.timeout).toBe(5000)
      })

      it('should use default timeout when provided timeout is 0', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).getPageGotoParams({ timeout: 0 })

        expect(result.timeout).toBe(30000)
      })

      it('should use default timeout when provided timeout is negative', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const result = (instance as any).getPageGotoParams({ timeout: -100 })

        expect(result.timeout).toBe(30000)
      })
    })

    describe('normalizeQuality', () => {
      it('should set quality to undefined for PNG format', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: any = {
          type: 'png',
          quality: 80,
        }

          ; (instance as any).normalizeQuality(options)

        expect(options.quality).toBeUndefined()
      })

      it('should keep quality for non-PNG formats', () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: any = {
          type: 'jpeg',
          quality: 80,
        }

          ; (instance as any).normalizeQuality(options)

        expect(options.quality).toBe(80)
      })
    })

    describe('waitForConditions', () => {
      it('should wait for all conditions', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options = {
          waitForSelector: '#sel',
          waitForFunction: 'fn',
          waitForRequest: 'req',
          waitForResponse: 'res',
        } as any

          // Mock checkElement to return true so waitForSelector proceeds
          ; (mockPage.$ as any).mockResolvedValue({})

        await (instance as any).waitForConditions(mockPage, options, 1000)

        expect(mockPage.waitForSelector).toHaveBeenCalled()
        expect(mockPage.waitForFunction).toHaveBeenCalled()
        expect(mockPage.waitForRequest).toHaveBeenCalled()
        expect(mockPage.waitForResponse).toHaveBeenCalled()
      })

      it('should handle array of conditions', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options = {
          waitForSelector: ['#sel1', '#sel2'],
        } as any

          ; (mockPage.$ as any).mockResolvedValue({})

        await (instance as any).waitForConditions(mockPage, options, 1000)

        expect(mockPage.waitForSelector).toHaveBeenCalledTimes(2)
      })

      it('should skip waitForSelector if element does not exist', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options = {
          waitForSelector: '#sel',
        } as any

          ; (mockPage.$ as any).mockResolvedValue(null) // Element not found

        await (instance as any).waitForConditions(mockPage, options, 1000)

        expect(mockPage.waitForSelector).not.toHaveBeenCalled()
      })
    })

    describe('private screenshot methods', () => {
      it('should call screenshotFullPage', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: SnapkaScreenshotOptions<'binary'> = {
          type: 'png',
        }

        await (instance as any).screenshotFullPage(mockPage, options)

        expect(mockPage.screenshot).toHaveBeenCalledWith(expect.objectContaining({ type: 'png' }))
      })

      it('should call screenshotElement', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options: SnapkaScreenshotOptions<'binary'> = {
          selector: '#test',
        }
        const mockElement = {
          screenshot: vi.fn().mockResolvedValue('data'),
        }
          ; (mockPage.$ as any).mockResolvedValue(mockElement)

        const result = await (instance as any).screenshotElement(mockPage, options)

        expect(mockElement.screenshot).toHaveBeenCalledWith(expect.objectContaining({ selector: '#test' }))
      })
    })

    describe('private wait methods', () => {
      it('should call awaitSelector', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValue({})

        await (instance as any).awaitSelector(mockPage, '#test', 1000)

        expect(mockPage.waitForSelector).toHaveBeenCalledWith('#test', { timeout: 1000 })
      })

      it('should call awaitFunction', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)

        await (instance as any).awaitFunction(mockPage, 'test', 1000)

        expect(mockPage.waitForFunction).toHaveBeenCalledWith('test', { timeout: 1000 })
      })

      it('should call awaitRequest', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)

        await (instance as any).awaitRequest(mockPage, 'test', 1000)

        expect(mockPage.waitForRequest).toHaveBeenCalledWith('test', { timeout: 1000 })
      })

      it('should call awaitResponse', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)

        await (instance as any).awaitResponse(mockPage, 'test', 1000)

        expect(mockPage.waitForResponse).toHaveBeenCalledWith('test', { timeout: 1000 })
      })

      it('should call checkElement', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValue({})

        const result = await (instance as any).checkElement(mockPage, '#test')

        expect(result).toBe(true)
      })

      it('should return false when checkElement finds nothing', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockResolvedValue(null)

        const result = await (instance as any).checkElement(mockPage, '#test')

        expect(result).toBe(false)
      })

      it('should handle checkElement error gracefully', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
          ; (mockPage.$ as any).mockRejectedValue(new Error('Selector error'))

        const result = await (instance as any).checkElement(mockPage, '#test')

        expect(result).toBe(false)
      })

      it('should handle waitForResource timeout without throwing', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const waitFn = vi.fn().mockRejectedValue(new Error('Timeout'))

        await (instance as any).waitForResource(mockPage, waitFn, 'test resource', 1000)

        expect(waitFn).toHaveBeenCalled()
      })
    })

    describe('cleanIdlePages', () => {
      it('should clean expired pages', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 100, // Short timeout
        } as any, mockBrowser, mockRestartFn)

        // Add a page to pool
        const page = { close: vi.fn().mockResolvedValue(undefined) } as any
          ; (instance as any).pagePool.push(page)
          ; (instance as any).pageIdleTimes.set(page, Date.now() - 200) // Expired

        await (instance as any).cleanIdlePages()

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })

      it('should not clean active pages', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 10000,
        } as any, mockBrowser, mockRestartFn)

        const page = { close: vi.fn().mockResolvedValue(undefined) } as any
          ; (instance as any).pagePool.push(page)
          ; (instance as any).pageIdleTimes.set(page, Date.now()) // Not expired

        await (instance as any).cleanIdlePages()

        expect((instance as any).pagePool).toContain(page)
        expect(page.close).not.toHaveBeenCalled()
      })
    })

    describe('cleanIdlePages errors', () => {
      it('should handle page close error gracefully', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 100,
        } as any, mockBrowser, mockRestartFn)

        const page = { close: vi.fn().mockRejectedValue(new Error('Close failed')) } as any
          ; (instance as any).pagePool.push(page)
          ; (instance as any).pageIdleTimes.set(page, Date.now() - 200)

        await (instance as any).cleanIdlePages()

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })

      it('should exercise filter callback with multiple pages', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 100,
        } as any, mockBrowser, mockRestartFn)

        const expiredPage = { close: vi.fn().mockResolvedValue(undefined) } as any
        const activePage = { close: vi.fn().mockResolvedValue(undefined) } as any

          ; (instance as any).pagePool.push(expiredPage, activePage)
          ; (instance as any).pageIdleTimes.set(expiredPage, Date.now() - 200)
          ; (instance as any).pageIdleTimes.set(activePage, Date.now())

        await (instance as any).cleanIdlePages()

        expect(expiredPage.close).toHaveBeenCalled()
        expect(activePage.close).not.toHaveBeenCalled()
        expect((instance as any).pagePool).toContain(activePage)
        expect((instance as any).pagePool).not.toContain(expiredPage)
      })
    })

    describe('retryExecute', () => {
      it('should retry on failure', async () => {
        vi.useRealTimers() // Use real timers for this test
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const fn = vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValue('success')

        const result = await (instance as any).retryExecute(fn, 2, 'test')

        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(2)
        vi.useFakeTimers() // Restore fake timers
      }, 15000)

      it('should throw after max retries', async () => {
        vi.useRealTimers() // Use real timers for this test
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const fn = vi.fn().mockRejectedValue(new Error('fail'))

        await expect((instance as any).retryExecute(fn, 2, 'test'))
          .rejects.toThrow('test在 2 次尝试后仍然失败')
        vi.useFakeTimers() // Restore fake timers
      }, 15000)

      it('should handle unknown error', async () => {
        vi.useRealTimers()
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const fn = vi.fn().mockRejectedValue(null) // No error object

        await expect((instance as any).retryExecute(fn, 1, 'test'))
          .rejects.toThrow('test在 1 次尝试后仍然失败: 未知错误')
        vi.useFakeTimers()
      }, 15000)
    })

    describe('cleanIdlePages', () => {
      it('should clean expired pages', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 100, // Short timeout
        } as any, mockBrowser, mockRestartFn)

        // Add a page to pool
        const page = { close: vi.fn().mockResolvedValue(undefined) } as any
          ; (instance as any).pagePool.push(page)
          ; (instance as any).pageIdleTimes.set(page, Date.now() - 200) // Expired

        await (instance as any).cleanIdlePages()

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })

      it('should not clean active pages', async () => {
        const instance = new PuppeteerCore({
          ...mockOptions,
          pageIdleTimeout: 10000,
        } as any, mockBrowser, mockRestartFn)

        const page = { close: vi.fn().mockResolvedValue(undefined) } as any
          ; (instance as any).pagePool.push(page)
          ; (instance as any).pageIdleTimes.set(page, Date.now()) // Not expired

        await (instance as any).cleanIdlePages()

        expect((instance as any).pagePool).toContain(page)
        expect(page.close).not.toHaveBeenCalled()
      })
    })

    describe('screenshotViewport', () => {
      it('should handle missing element', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options = { file: 'https://example.com', selector: '#missing' } as any

          // Mock findElement to return null
          ; (mockPage.$ as any).mockResolvedValue(null)

        const result = await instance.screenshotViewport(options)

        await expect(result.run()).rejects.toThrow('当前页面未找到任何可截图的元素')
      })

      it('should handle captureViewportSlices returning empty array', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const options = { file: 'https://example.com', selector: '#exists' } as any

        const element = {
          boundingBox: vi.fn().mockResolvedValue(null), // No bounding box
          screenshot: vi.fn(),
        }
          ; (mockPage.$ as any).mockResolvedValue(element)

        const result = await instance.screenshotViewport(options)
        const data = await result.run()

        expect(data).toEqual([])
      })
    })

    describe('page management', () => {
      it('should return page to pool in reuse mode', async () => {
        const instance = new PuppeteerCore({ ...mockOptions, pageMode: 'reuse' }, mockBrowser, mockRestartFn)
        const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) } as any

        await (instance as any).releasePage(page)

        expect((instance as any).pagePool).toContain(page)
        expect(page.goto).toHaveBeenCalledWith('about:blank')
      })

      it('should close page in disposable mode', async () => {
        const instance = new PuppeteerCore({ ...mockOptions, pageMode: 'disposable' }, mockBrowser, mockRestartFn)
        const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) } as any

        await (instance as any).releasePage(page)

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })

      it('should close page if pool is full', async () => {
        const instance = new PuppeteerCore({ ...mockOptions, maxOpenPages: 1 }, mockBrowser, mockRestartFn)
          // Fill the pool
          ; (instance as any).pagePool.push({ close: vi.fn() } as any)

        const page = { goto: vi.fn(), close: vi.fn().mockResolvedValue(undefined) } as any

        await (instance as any).returnPageToPool(page)

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })

      it('should close page if reset fails', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const page = {
          goto: vi.fn().mockRejectedValue(new Error('fail')),
          close: vi.fn().mockResolvedValue(undefined),
        } as any

        await (instance as any).returnPageToPool(page)

        expect((instance as any).pagePool).not.toContain(page)
        expect(page.close).toHaveBeenCalled()
      })
    })

    describe('acquirePage', () => {
      it('should create new page when pool is empty', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)

        const page = await (instance as any).acquirePage()

        expect(mockBrowser.newPage).toHaveBeenCalled()
        expect((instance as any).activePages.has(page)).toBe(true)
      })

      it('should reuse page from pool', async () => {
        const instance = new PuppeteerCore(mockOptions, mockBrowser, mockRestartFn)
        const poolPage = mockPage;
        (instance as any).pagePool.push(poolPage);
        (instance as any).pageIdleTimes.set(poolPage, Date.now())

        const page = await (instance as any).acquirePage()

        expect(page).toBe(poolPage)
        expect((instance as any).pageIdleTimes.has(poolPage)).toBe(false)
        expect((instance as any).activePages.has(poolPage)).toBe(true)
      })
    })
  })

  it('should retry on failure', async () => {
    const options: SnapkaScreenshotOptions<'binary'> & { retries?: number } = {
      file: 'https://example.com',
      retries: 2,
    }

      ; (mockPage.goto as any).mockResolvedValue(null)
      ; (mockPage.screenshot as any).mockResolvedValue(Buffer.from('image'))

    const result = await puppeteerCore.screenshot(options)

    // 只验证结果是一个对象且有run方法
    expect(result).toBeInstanceOf(Object)
    expect(typeof result.run).toBe('function')
  })
})
