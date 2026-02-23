import { describe, it, expect } from 'vitest'
import { getDownloadUrl } from '../src/install'
import { Browser, BrowserPlatform } from '../src/browser-data/types'

describe('install', () => {
  describe('getDownloadUrl', () => {
    it('应该返回 Chrome 的正确下载 URL', () => {
      const url = getDownloadUrl(Browser.CHROME, BrowserPlatform.WIN64, '120.0.6099.109')
      expect(url).toBeInstanceOf(URL)
      expect(url.href).toContain('120.0.6099.109')
      expect(url.href).toContain('win64')
    })

    it('应该返回 Chromium 的正确下载 URL', () => {
      const url = getDownloadUrl(Browser.CHROMIUM, BrowserPlatform.LINUX, '1234567')
      expect(url).toBeInstanceOf(URL)
      expect(url.href).toContain('1234567')
    })

    it('应该返回 Firefox 的正确下载 URL', () => {
      const url = getDownloadUrl(Browser.FIREFOX, BrowserPlatform.LINUX, 'nightly_135.0')
      expect(url).toBeInstanceOf(URL)
      expect(url.href).toContain('firefox')
    })

    it('应该支持自定义 baseUrl', () => {
      const url = getDownloadUrl(
        Browser.CHROME,
        BrowserPlatform.WIN64,
        '120.0.6099.109',
        'https://custom.mirror.com'
      )
      expect(url.href).toContain('custom.mirror.com')
    })

    it('默认 Chrome/ChromeDriver/HeadlessShell 应该使用阿里云镜像', () => {
      for (const browser of [Browser.CHROME, Browser.CHROMEDRIVER, Browser.CHROMEHEADLESSSHELL]) {
        const url = getDownloadUrl(browser, BrowserPlatform.LINUX, '120.0.6099.109')
        expect(url.href).toContain('registry.npmmirror.com')
      }
    })

    it('默认 Chromium 应该使用阿里云镜像', () => {
      const url = getDownloadUrl(Browser.CHROMIUM, BrowserPlatform.LINUX, '1234567')
      expect(url.href).toContain('registry.npmmirror.com')
    })
  })
})
