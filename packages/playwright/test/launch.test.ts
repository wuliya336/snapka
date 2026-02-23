import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlaywrightLaunch } from '../src/launch'
import fs from 'node:fs'

import { browserFinder } from '@snapka/browser-finder'
import { probeUrls, resolveBuildId, install, detectBrowserPlatform } from '@snapka/browsers'

// 模拟依赖
vi.mock('node:fs', () => {
  const mockFn = vi.fn()
  return {
    default: {
      existsSync: mockFn,
    },
    existsSync: mockFn,
  }
})

vi.mock('@snapka/browser-finder', () => ({
  browserFinder: {
    findChromeHeadlessShell: vi.fn(),
    findChromium: vi.fn(),
    findChrome: vi.fn(),
    findBrave: vi.fn(),
    findEdge: vi.fn(),
  },
}))

vi.mock('@snapka/browsers', () => ({
  probeUrls: vi.fn(),
  resolveBuildId: vi.fn(),
  install: vi.fn(),
  detectBrowserPlatform: vi.fn(),
}))

describe('PlaywrightLaunch', () => {
  let playwrightLaunch: PlaywrightLaunch
  const mockBrowserFinder = browserFinder as any
  const mockBrowsers = { probeUrls, resolveBuildId, install, detectBrowserPlatform } as any
  const mockFs = fs as any
  const originalPlatform = process.platform

  beforeEach(() => {
    playwrightLaunch = new PlaywrightLaunch()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('getPath', () => {
    it('should return custom path when provided and valid', async () => {
      const customPath = '/path/to/chrome'
      mockFs.existsSync.mockReturnValue(true)

      const result = await playwrightLaunch.getPath({ executablePath: customPath })

      expect(result).toBe(customPath)
      expect(mockFs.existsSync).toHaveBeenCalledWith(customPath)
    })

    it('should return null when custom path is invalid', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await expect(playwrightLaunch.getPath({ executablePath: '/invalid/path' }))
        .rejects.toThrow('executablePath 指定的路径不存在')
    })

    it('should throw error when custom path is not a string', async () => {
      await expect(playwrightLaunch.getPath({ executablePath: 123 as any }))
        .rejects.toThrow('executablePath 仅支持 string 类型')
    })

    it('should find browser when findBrowser is true', async () => {
      mockFs.existsSync.mockReturnValue(false)
      const foundPath = '/found/browser'
      mockBrowserFinder.findChromeHeadlessShell.mockResolvedValue([{ executablePath: foundPath }])

      const result = await playwrightLaunch.getPath({ findBrowser: true })

      expect(result).toBe(foundPath)
    })

    it('should return null when findBrowser is false and download is disabled', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const result = await playwrightLaunch.getPath({ findBrowser: false, download: { enable: false } })

      expect(result).toBe(null)
    })

    it('should download browser when not found and download is enabled', async () => {
      mockFs.existsSync.mockReturnValue(false)
      mockBrowserFinder.findChromeHeadlessShell.mockResolvedValue([])
      mockBrowserFinder.findChromium.mockResolvedValue([])
      mockBrowserFinder.findChrome.mockResolvedValue([])
      mockBrowserFinder.findBrave.mockResolvedValue([])
      mockBrowserFinder.findEdge.mockResolvedValue([])

      const downloadedPath = '/downloaded/browser'
      mockBrowsers.detectBrowserPlatform.mockReturnValue('win64')
      mockBrowsers.resolveBuildId.mockResolvedValue('123456')
      mockBrowsers.install.mockResolvedValue({ executablePath: downloadedPath })
      mockBrowsers.probeUrls.mockResolvedValue('https://example.com')

      const result = await playwrightLaunch.getPath({ download: { enable: true } })

      expect(result).toBe(downloadedPath)
    })
  })

  describe('validatePath', () => {
    it('should return null when path is null or undefined', () => {
      expect((playwrightLaunch as any).validatePath(null)).toBe(null)
      expect((playwrightLaunch as any).validatePath(undefined)).toBe(null)
    })

    it('should throw TypeError when path is not a string', () => {
      expect(() => (playwrightLaunch as any).validatePath(123)).toThrow('executablePath 仅支持 string 类型')
      expect(() => (playwrightLaunch as any).validatePath({})).toThrow('executablePath 仅支持 string 类型')
    })

    it('should throw Error when path does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)
      expect(() => (playwrightLaunch as any).validatePath('/invalid/path'))
        .toThrow('executablePath 指定的路径不存在')
    })

    it('should return path when path exists', () => {
      const validPath = '/valid/path'
      mockFs.existsSync.mockReturnValue(true)
      expect((playwrightLaunch as any).validatePath(validPath)).toBe(validPath)
    })
  })

  describe('find', () => {
    it('should find headed browsers first on Windows in debug mode', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const headedPath = '/windows/chrome'

      mockBrowserFinder.findChrome.mockResolvedValue([{ executablePath: headedPath }])
      mockBrowserFinder.findEdge.mockResolvedValue([])
      mockBrowserFinder.findBrave.mockResolvedValue([])
      mockBrowserFinder.findChromium.mockResolvedValue([])

      const result = await (playwrightLaunch as any).find(true)

      expect(result).toBe(headedPath)
      expect(mockBrowserFinder.findChrome).toHaveBeenCalled()
    })

    it('should find headless browsers first on non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      const headlessPath = '/mac/chrome-headless'

      mockBrowserFinder.findChromeHeadlessShell.mockResolvedValue([{ executablePath: headlessPath }])

      const result = await (playwrightLaunch as any).find(false)

      expect(result).toBe(headlessPath)
      expect(mockBrowserFinder.findChromeHeadlessShell).toHaveBeenCalled()
    })

    it('should return null when no browsers found', async () => {
      mockBrowserFinder.findChromeHeadlessShell.mockResolvedValue([])
      mockBrowserFinder.findChromium.mockResolvedValue([])
      mockBrowserFinder.findChrome.mockResolvedValue([])
      mockBrowserFinder.findBrave.mockResolvedValue([])
      mockBrowserFinder.findEdge.mockResolvedValue([])

      const result = await (playwrightLaunch as any).find(false)

      expect(result).toBe(null)
    })
  })

  describe('runFinders', () => {
    it('should return first found browser path', async () => {
      const finders = [
        vi.fn().mockResolvedValue([{ executablePath: '/path1' }]),
        vi.fn().mockResolvedValue([]),
        vi.fn().mockResolvedValue([{ executablePath: '/path3' }]),
      ]

      const result = await (playwrightLaunch as any).runFinders(finders as any)

      expect(result).toBe('/path1')
      expect(finders[0]).toHaveBeenCalled()
      expect(finders[1]).not.toHaveBeenCalled()
      expect(finders[2]).not.toHaveBeenCalled()
    })

    it('should return null when all finders return empty', async () => {
      const finders = [
        vi.fn().mockResolvedValue([]),
        vi.fn().mockResolvedValue([]),
      ]

      const result = await (playwrightLaunch as any).runFinders(finders as any)

      expect(result).toBe(null)
      expect(finders[0]).toHaveBeenCalled()
      expect(finders[1]).toHaveBeenCalled()
    })
  })

  describe('download', () => {
    it('should download browser when platform is supported', async () => {
      const downloadedPath = '/downloaded/browser'

      mockBrowsers.detectBrowserPlatform.mockReturnValue('win64')
      mockBrowsers.resolveBuildId.mockResolvedValue('123456')
      mockBrowsers.install.mockResolvedValue({ executablePath: downloadedPath })
      mockBrowsers.probeUrls.mockResolvedValue('https://example.com')

      const result = await (playwrightLaunch as any).download()

      expect(result).toBe(downloadedPath)
      expect(mockBrowsers.detectBrowserPlatform).toHaveBeenCalled()
      expect(mockBrowsers.resolveBuildId).toHaveBeenCalled()
      expect(mockBrowsers.install).toHaveBeenCalled()
    })

    it('should throw error when platform is not supported', async () => {
      mockBrowsers.detectBrowserPlatform.mockReturnValue(null)
      Object.defineProperty(process, 'platform', { value: 'win32' })
      Object.defineProperty(process, 'arch', { value: 'x64' })

      await expect((playwrightLaunch as any).download())
        .rejects.toThrow('不支持当前平台: win32_x64')
    })
  })

  describe('getBrowserType', () => {
    it('should return chromium by default on Windows platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const result = (playwrightLaunch as any).getBrowserType()

      expect(result).toBe('chromium')
    })

    it('should return chrome-headless-shell by default on non-Windows platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const result = (playwrightLaunch as any).getBrowserType()

      expect(result).toBe('chrome-headless-shell')
    })

    it('should return custom browser type when provided', () => {
      expect((playwrightLaunch as any).getBrowserType('chrome')).toBe('chrome')
      expect((playwrightLaunch as any).getBrowserType('chromium')).toBe('chromium')
      expect((playwrightLaunch as any).getBrowserType('chrome-headless-shell')).toBe('chrome-headless-shell')
    })

    it('should throw error for unsupported browser types', () => {
      expect(() => (playwrightLaunch as any).getBrowserType('firefox'))
        .toThrow("download.browser 仅支持 'chrome-headless-shell' | 'chromium' | 'chrome' 三种类型")
    })
  })

  describe('getBaseUrl', () => {
    it('should return custom base url when provided', async () => {
      const customUrl = 'https://custom-mirror.com'
      const launchInstance = new PlaywrightLaunch()

      const result = await (launchInstance as any).getBaseUrl('chrome', customUrl)

      expect(result).toBe(customUrl)
    })

    it('should probe chromium urls when browser is chromium', async () => {
      const probeUrl = 'https://fastest-url.com'
      mockBrowsers.probeUrls.mockResolvedValue(probeUrl)

      const launchInstance = new PlaywrightLaunch()
      const result = await (launchInstance as any).getBaseUrl('chromium')

      expect(result).toBe(probeUrl)
      expect(mockBrowsers.probeUrls).toHaveBeenCalledWith([
        'https://registry.npmmirror.com/-/binary/chromium-browser-snapshots',
        'https://storage.googleapis.com/chromium-browser-snapshots',
      ])
    })

    it('should probe chrome urls when browser is not chromium', async () => {
      const probeUrl = 'https://fastest-url.com'
      mockBrowsers.probeUrls.mockResolvedValue(probeUrl)

      const launchInstance = new PlaywrightLaunch()
      const result = await (launchInstance as any).getBaseUrl('chrome')

      expect(result).toBe(probeUrl)
      expect(mockBrowsers.probeUrls).toHaveBeenCalledWith([
        'https://registry.npmmirror.com/-/binary/chrome-for-testing',
        'https://storage.googleapis.com/chrome-for-testing-public',
      ])
    })
  })
})
