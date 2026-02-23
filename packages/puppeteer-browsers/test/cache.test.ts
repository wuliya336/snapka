import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Cache, InstalledBrowser } from '../src/Cache'
import { Browser, BrowserPlatform } from '../src/browser-data/types'

describe('Cache', () => {
  let tmpDir: string
  let cache: Cache

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `snapka-test-cache-${Date.now()}`)
    cache = new Cache(tmpDir)
  })

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  describe('目录结构', () => {
    it('rootDir 应该返回缓存根目录', () => {
      expect(cache.rootDir).toBe(tmpDir)
    })

    it('browserRoot 应该返回浏览器根目录', () => {
      expect(cache.browserRoot(Browser.CHROME)).toBe(path.join(tmpDir, 'chrome'))
    })

    it('installationDir 应该返回安装目录', () => {
      const dir = cache.installationDir(Browser.CHROME, BrowserPlatform.WIN64, '120.0.6099.109')
      expect(dir).toBe(path.join(tmpDir, 'chrome', 'win64-120.0.6099.109'))
    })
  })

  describe('metadata', () => {
    it('不存在时应该返回空 aliases', () => {
      const metadata = cache.readMetadata(Browser.CHROME)
      expect(metadata).toEqual({ aliases: {} })
    })

    it('应该能正常写入和读取 metadata', () => {
      const browserRoot = cache.browserRoot(Browser.CHROME)
      fs.mkdirSync(browserRoot, { recursive: true })

      const metadata = { aliases: { stable: '120.0.6099.109' } }
      cache.writeMetadata(Browser.CHROME, metadata)

      const result = cache.readMetadata(Browser.CHROME)
      expect(result).toEqual(metadata)
    })
  })

  describe('resolveAlias', () => {
    it('不存在的别名应该返回 undefined', () => {
      expect(cache.resolveAlias(Browser.CHROME, 'nonexistent')).toBeUndefined()
    })

    it('应该正确解析已存在的别名', () => {
      const browserRoot = cache.browserRoot(Browser.CHROME)
      fs.mkdirSync(browserRoot, { recursive: true })
      cache.writeMetadata(Browser.CHROME, { aliases: { stable: '120.0.6099.109' } })

      expect(cache.resolveAlias(Browser.CHROME, 'stable')).toBe('120.0.6099.109')
    })
  })

  describe('getInstalledBrowsers', () => {
    it('空缓存目录应该返回空数组', () => {
      expect(cache.getInstalledBrowsers()).toEqual([])
    })

    it('应该找到已安装的浏览器', () => {
      const installDir = cache.installationDir(Browser.CHROME, BrowserPlatform.WIN64, '120.0.6099.109')
      fs.mkdirSync(installDir, { recursive: true })

      const installed = cache.getInstalledBrowsers()
      expect(installed).toHaveLength(1)
      expect(installed[0].browser).toBe(Browser.CHROME)
      expect(installed[0].buildId).toBe('120.0.6099.109')
      expect(installed[0].platform).toBe(BrowserPlatform.WIN64)
    })
  })

  describe('uninstall', () => {
    it('应该删除安装目录', () => {
      const installDir = cache.installationDir(Browser.CHROME, BrowserPlatform.WIN64, '120.0.6099.109')
      fs.mkdirSync(installDir, { recursive: true })
      expect(fs.existsSync(installDir)).toBe(true)

      cache.uninstall(Browser.CHROME, BrowserPlatform.WIN64, '120.0.6099.109')
      expect(fs.existsSync(installDir)).toBe(false)
    })
  })

  describe('clear', () => {
    it('应该清除整个缓存目录', () => {
      const installDir = cache.installationDir(Browser.CHROME, BrowserPlatform.WIN64, '120')
      fs.mkdirSync(installDir, { recursive: true })
      expect(fs.existsSync(tmpDir)).toBe(true)

      cache.clear()
      expect(fs.existsSync(tmpDir)).toBe(false)
    })
  })
})
