import { describe, it, expect } from 'vitest'
import { resolveDownloadUrl, resolveDownloadPath, relativeExecutablePath } from '../src/browser-data/chrome'
import { resolveDownloadUrl as chromiumDownloadUrl, resolveDownloadPath as chromiumDownloadPath } from '../src/browser-data/chromium'
import { resolveDownloadUrl as chromeHeadlessShellDownloadUrl } from '../src/browser-data/chrome-headless-shell'
import { resolveDownloadUrl as chromedriverDownloadUrl } from '../src/browser-data/chromedriver'
import { resolveDownloadUrl as firefoxDownloadUrl } from '../src/browser-data/firefox'
import { BrowserPlatform } from '../src/browser-data/types'

describe('browser-data 下载 URL', () => {
  describe('chrome', () => {
    it('默认应该使用阿里云镜像', () => {
      const url = resolveDownloadUrl(BrowserPlatform.WIN64, '120.0.6099.109')
      expect(url).toContain('registry.npmmirror.com')
      expect(url).toContain('chrome-for-testing-public')
    })

    it('应该支持自定义 baseUrl', () => {
      const url = resolveDownloadUrl(BrowserPlatform.WIN64, '120.0.6099.109', 'https://custom.example.com')
      expect(url).toContain('custom.example.com')
    })

    it('应该生成正确的下载路径', () => {
      const path = resolveDownloadPath(BrowserPlatform.WIN64, '120.0.6099.109')
      expect(path).toEqual(['120.0.6099.109', 'win64', 'chrome-win64.zip'])
    })

    it('应该返回各平台正确的下载路径', () => {
      expect(resolveDownloadPath(BrowserPlatform.LINUX, '120.0.6099.109')).toEqual(['120.0.6099.109', 'linux64', 'chrome-linux64.zip'])
      expect(resolveDownloadPath(BrowserPlatform.MAC_ARM, '120.0.6099.109')).toEqual(['120.0.6099.109', 'mac-arm64', 'chrome-mac-arm64.zip'])
      expect(resolveDownloadPath(BrowserPlatform.MAC, '120.0.6099.109')).toEqual(['120.0.6099.109', 'mac-x64', 'chrome-mac-x64.zip'])
      expect(resolveDownloadPath(BrowserPlatform.WIN32, '120.0.6099.109')).toEqual(['120.0.6099.109', 'win32', 'chrome-win32.zip'])
    })

    it('应该返回各平台正确的可执行文件路径', () => {
      expect(relativeExecutablePath(BrowserPlatform.WIN64, '120')).toContain('chrome.exe')
      expect(relativeExecutablePath(BrowserPlatform.LINUX, '120')).toContain('chrome')
      expect(relativeExecutablePath(BrowserPlatform.MAC, '120')).toContain('Google Chrome for Testing')
    })
  })

  describe('chromium', () => {
    it('默认应该使用阿里云镜像', () => {
      const url = chromiumDownloadUrl(BrowserPlatform.WIN64, '1234567')
      expect(url).toContain('registry.npmmirror.com')
      expect(url).toContain('chromium-browser-snapshots')
    })

    it('应该生成正确的下载路径', () => {
      const path = chromiumDownloadPath(BrowserPlatform.WIN64, '1234567')
      expect(path).toEqual(['Win_x64', '1234567', 'chrome-win.zip'])
    })

    it('应该生成旧版 Windows 路径', () => {
      const path = chromiumDownloadPath(BrowserPlatform.WIN64, '500000')
      expect(path).toEqual(['Win_x64', '500000', 'chrome-win32.zip'])
    })
  })

  describe('chrome-headless-shell', () => {
    it('默认应该使用阿里云镜像', () => {
      const url = chromeHeadlessShellDownloadUrl(BrowserPlatform.LINUX, '120.0.6099.109')
      expect(url).toContain('registry.npmmirror.com')
      expect(url).toContain('chrome-headless-shell-linux64.zip')
    })
  })

  describe('chromedriver', () => {
    it('默认应该使用阿里云镜像', () => {
      const url = chromedriverDownloadUrl(BrowserPlatform.LINUX, '120.0.6099.109')
      expect(url).toContain('registry.npmmirror.com')
      expect(url).toContain('chromedriver-linux64.zip')
    })
  })

  describe('firefox', () => {
    it('nightly 版本应该使用 Mozilla 默认源', () => {
      const url = firefoxDownloadUrl(BrowserPlatform.LINUX, 'nightly_135.0')
      expect(url).toContain('archive.mozilla.org')
    })

    it('应该支持自定义 baseUrl', () => {
      const url = firefoxDownloadUrl(BrowserPlatform.LINUX, 'stable_120.0', 'https://custom.example.com')
      expect(url).toContain('custom.example.com')
    })
  })
})
