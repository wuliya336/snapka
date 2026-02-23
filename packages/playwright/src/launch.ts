import fs from 'node:fs'
import os from 'node:os'
import { browserFinder } from '@snapka/browser-finder'
import { probeUrls, resolveBuildId, install, detectBrowserPlatform } from '@snapka/browsers'

import type { LaunchOptions as SnapkaLaunchOptions, ConnectOptions as SnapkaConnectOptions } from '@snapka/types'

export interface PlaywrightLaunchOptions extends SnapkaLaunchOptions {
  /**
   * 浏览器可执行文件路径
   */
  executablePath?: string
  /**
   * 是否启用寻找浏览器功能
   */
  findBrowser?: boolean
  /**
   * 调试模式
   */
  debug?: boolean
  /**
   * 浏览器下载配置
   */
  download?: {
    enable?: boolean
    dir?: string
    version?: string
    browser?: 'chrome' | 'chromium' | 'chrome-headless-shell'
    baseUrl?: string
  }
  /**
   * Playwright 特定的启动选项
   */
  channel?: string
  chromiumSandbox?: boolean
  devtools?: boolean
  downloadsPath?: string
  env?: Record<string, string | undefined>
  firefoxUserPrefs?: Record<string, string | number | boolean>
  handleSIGHUP?: boolean
  handleSIGINT?: boolean
  handleSIGTERM?: boolean
  ignoreDefaultArgs?: boolean | string[]
  proxy?: {
    server: string
    bypass?: string
    username?: string
    password?: string
  }
  timeout?: number
  tracesDir?: string
}

export interface PlaywrightConnectOptions extends SnapkaConnectOptions {
  /**
   * 浏览器ws连接地址
   */
  baseUrl: string
  /**
   * 自定义请求头
   */
  headers?: Record<string, string>
  /**
   * Playwright 特定的连接选项
   */
  timeout?: number
}

/**
 * Playwright 启动器类
 * 负责浏览器路径解析、查找和下载
 */
export class PlaywrightLaunch {
  /**
   * 获取浏览器可执行文件路径
   * @param options - 启动选项
   * @returns 浏览器路径或 null
   */
  async getPath (options?: PlaywrightLaunchOptions): Promise<string | null> {
    const customPath = this.validatePath(options?.executablePath)
    if (customPath) return customPath

    const findBrowser = options?.findBrowser ?? true
    if (findBrowser) {
      const foundPath = await this.find(options?.debug)
      if (foundPath) return foundPath
    }

    if (options?.download?.enable === false) {
      return null
    }

    return await this.download(options?.download)
  }

  /**
   * 验证自定义可执行文件路径
   * @param path - 文件路径
   * @returns 验证通过的路径或 null
   * @throws {TypeError} 路径类型错误
   * @throws {Error} 路径不存在
   */
  private validatePath (path?: string | unknown): string | null {
    if (!path) return null

    if (typeof path !== 'string') {
      throw new TypeError('executablePath 仅支持 string 类型')
    }

    if (!fs.existsSync(path)) {
      throw new Error(`executablePath 指定的路径不存在: ${path}`)
    }

    return path
  }

  /**
   * 查找本地浏览器
   * @param debug - 是否调试模式
   * @returns 浏览器路径或 null
   */
  private async find (debug?: boolean): Promise<string | null> {
    if (process.platform === 'win32' && debug) {
      const headedPath = await this.runFinders([
        browserFinder.findChrome,
        browserFinder.findEdge,
        browserFinder.findBrave,
        browserFinder.findChromium,
      ])
      if (headedPath) return headedPath
    }

    return await this.runFinders([
      browserFinder.findChromeHeadlessShell,
      browserFinder.findChromium,
      browserFinder.findChrome,
      browserFinder.findBrave,
      browserFinder.findEdge,
    ])
  }

  /**
   * 执行多个查找器
   * @param finders - 查找器列表
   * @returns 第一个找到的浏览器路径或 null
   */
  private async runFinders (finders: Array<typeof browserFinder.findChrome>): Promise<string | null> {
    for (const finder of finders) {
      const res = await finder.call(browserFinder)
      const path = res.length ? res[0]?.executablePath ?? null : null
      if (path) return path
    }
    return null
  }

  /**
   * 下载浏览器
   * @param config - 下载配置
   * @returns 浏览器可执行文件路径
   * @throws {TypeError} 平台不支持
   */
  private async download (config?: PlaywrightLaunchOptions['download']): Promise<string> {
    const platform = detectBrowserPlatform()
    if (!platform) {
      throw new TypeError(`不支持当前平台: ${os.platform()}_${os.arch()}`)
    }

    const options = config || { enable: true }
    const tag = options.version ?? 'stable'
    const browser = this.getBrowserType(options.browser)

    const baseUrl = await this.getBaseUrl(browser, options.baseUrl)

    const buildId = await resolveBuildId(browser as any, platform, tag)
    const { executablePath } = await install({
      browser: browser as any,
      buildId,
      platform,
      baseUrl,
      cacheDir: options.dir || `${os.homedir()}/.cache/playwright`,
      downloadProgressCallback: 'default',
      installDeps: true,
    })

    return executablePath
  }

  /**
   * 获取浏览器类型
   * @param browser - 浏览器名称
   * @returns 标准化的浏览器类型
   * @throws {TypeError} 不支持的浏览器类型
   */
  private getBrowserType (browser?: string): 'chrome-headless-shell' | 'chromium' | 'chrome' {
    const type: any = browser || (process.platform === 'win32' ? 'chromium' : 'chrome-headless-shell')

    if (!['chrome-headless-shell', 'chromium', 'chrome'].includes(type)) {
      throw new TypeError('download.browser 仅支持 \'chrome-headless-shell\' | \'chromium\' | \'chrome\' 三种类型')
    }

    return type
  }

  /**
   * 获取下载源地址
   * @param browser - 浏览器类型
   * @param url - 自定义下载源
   * @returns 最快的下载源地址
   */
  private async getBaseUrl (browser: string, url?: string): Promise<string> {
    if (typeof url === 'string') {
      return url
    }
    const baseUrls = browser === 'chromium'
      ? [
        'https://registry.npmmirror.com/-/binary/chromium-browser-snapshots',
        'https://storage.googleapis.com/chromium-browser-snapshots',
      ]
      : [
        'https://registry.npmmirror.com/-/binary/chrome-for-testing',
        'https://storage.googleapis.com/chrome-for-testing-public',
      ]

    return probeUrls(baseUrls)
  }
}
