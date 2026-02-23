import { describe, it, expect } from 'vitest'
import {
  Browser,
  BrowserPlatform,
  BrowserTag,
  ChromeReleaseChannel,
} from '../src/browser-data/types'

describe('browser-data/types', () => {
  describe('Browser enum', () => {
    it('应该包含所有浏览器类型', () => {
      expect(Browser.CHROME).toBe('chrome')
      expect(Browser.CHROMEHEADLESSSHELL).toBe('chrome-headless-shell')
      expect(Browser.CHROMIUM).toBe('chromium')
      expect(Browser.FIREFOX).toBe('firefox')
      expect(Browser.CHROMEDRIVER).toBe('chromedriver')
    })

    it('应该有 5 种浏览器类型', () => {
      expect(Object.values(Browser)).toHaveLength(5)
    })
  })

  describe('BrowserPlatform enum', () => {
    it('应该包含所有平台', () => {
      expect(BrowserPlatform.LINUX).toBe('linux')
      expect(BrowserPlatform.LINUX_ARM).toBe('linux_arm')
      expect(BrowserPlatform.MAC).toBe('mac')
      expect(BrowserPlatform.MAC_ARM).toBe('mac_arm')
      expect(BrowserPlatform.WIN32).toBe('win32')
      expect(BrowserPlatform.WIN64).toBe('win64')
    })

    it('应该有 6 种平台', () => {
      expect(Object.values(BrowserPlatform)).toHaveLength(6)
    })
  })

  describe('BrowserTag enum', () => {
    it('应该包含所有版本标签', () => {
      expect(BrowserTag.CANARY).toBe('canary')
      expect(BrowserTag.NIGHTLY).toBe('nightly')
      expect(BrowserTag.BETA).toBe('beta')
      expect(BrowserTag.DEV).toBe('dev')
      expect(BrowserTag.DEVEDITION).toBe('devedition')
      expect(BrowserTag.STABLE).toBe('stable')
      expect(BrowserTag.ESR).toBe('esr')
      expect(BrowserTag.LATEST).toBe('latest')
    })

    it('应该有 8 种标签', () => {
      expect(Object.values(BrowserTag)).toHaveLength(8)
    })
  })

  describe('ChromeReleaseChannel enum', () => {
    it('应该包含所有发布渠道', () => {
      expect(ChromeReleaseChannel.STABLE).toBe('stable')
      expect(ChromeReleaseChannel.DEV).toBe('dev')
      expect(ChromeReleaseChannel.CANARY).toBe('canary')
      expect(ChromeReleaseChannel.BETA).toBe('beta')
    })

    it('应该有 4 种渠道', () => {
      expect(Object.values(ChromeReleaseChannel)).toHaveLength(4)
    })
  })
})
