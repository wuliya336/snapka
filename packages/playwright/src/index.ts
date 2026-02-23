import { PlaywrightCore } from './core'
import { PlaywrightLaunch } from './launch'
import playwright, { Browser } from '@snapka/playwright-core'

import type { PlaywrightLaunchOptions, PlaywrightConnectOptions } from './launch'

export type { PlaywrightCore } from './core'
export type { PlaywrightLaunchOptions, PlaywrightConnectOptions } from './launch'

const browsers: Browser[] = []

export const snapka = {
  /**
   * 已启动的浏览器实例列表
   */
  browsers,
  /**
   * 启动一个新的浏览器实例
   * @param options - 启动选项
   * @returns PlaywrightCore 实例
   */
  launch: async (options: PlaywrightLaunchOptions = {}) => {
    const launcher = new PlaywrightLaunch()
    const executablePath = await launcher.getPath(options)
    if (!executablePath) {
      throw new Error('无法获取浏览器可执行文件路径，请检查配置项或手动指定 executablePath')
    }

    options.executablePath = executablePath

    const headless = options.headless !== 'false'
    const browser = await playwright.chromium.launch({ ...options, headless })
    const viewport = options.defaultViewport || { width: 800, height: 600 }
    browsers.push(browser)

    /** 采用单窗口保活的形式进行截图渲染 提高性能 */
    const context = await browser.newContext({ viewport })
    const initialPage = await context.newPage()

    let currentBrowser = browser
    const restart = async () => {
      const newBrowser = await playwright.chromium.launch({ ...options, headless })
      const index = browsers.indexOf(currentBrowser)
      index > -1 ? browsers[index] = newBrowser : browsers.push(newBrowser)
      currentBrowser = newBrowser
      return newBrowser
    }

    return new PlaywrightCore(options, browser, restart, context, initialPage)
  },
  /**
   * 连接到一个已启动的浏览器实例
   * @param options - 连接选项
   * @returns PlaywrightCore 实例
   */
  connect: async (options: PlaywrightConnectOptions) => {
    const browserURL = options.baseUrl
    const browser = await playwright.chromium.connect(browserURL, options)
    browsers.push(browser)

    const context = await browser.newContext({ viewport: options.defaultViewport || { width: 800, height: 600 } })
    const initialPage = await context.newPage()

    let currentBrowser = browser
    const restart = async () => {
      const newBrowser = await playwright.chromium.connect(browserURL, options)
      const index = browsers.indexOf(currentBrowser)
      index > -1 ? browsers[index] = newBrowser : browsers.push(newBrowser)
      currentBrowser = newBrowser
      return newBrowser
    }

    return new PlaywrightCore(options, browser, restart, context, initialPage)
  },
}
