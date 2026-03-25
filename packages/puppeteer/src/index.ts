import { PuppeteerCore } from './core'
import { SnapkaLaunch } from './launch'
import puppeteer, { Browser } from 'puppeteer-core'

import type { PuppeteerLaunchOptions, PuppeteerConnectOptions } from './launch'

export type { PuppeteerCore } from './core'
export type { PuppeteerLaunchOptions, PuppeteerConnectOptions } from './launch'

const browsers: Browser[] = []

export const snapka = {
  /**
   * 已启动的浏览器实例列表
   */
  browsers,
  /**
   * 启动一个新的浏览器实例
   * @param options - 启动选项
   * @returns PuppeteerCore 实例
   */
  launch: async (options: PuppeteerLaunchOptions = {}) => {
    const launcher = new SnapkaLaunch()
    const executablePath = await launcher.getPath(options)
    if (!executablePath) {
      throw new Error('无法获取浏览器可执行文件路径，请检查配置项或手动指定 executablePath')
    }

    options.executablePath = executablePath
    const headless: boolean | 'shell' = options.headless
      ? options.headless === 'shell' ? 'shell' : options.headless !== 'false'
      : 'shell'

    const browser = await puppeteer.launch({ ...options, headless })
    browsers.push(browser)

    let currentBrowser = browser
    const restart = async () => {
      const newBrowser = await puppeteer.launch({ ...options, headless })
      /** 替换掉旧的浏览器实例 */
      const index = browsers.indexOf(currentBrowser)
      index > -1 ? browsers[index] = newBrowser : browsers.push(newBrowser)
      currentBrowser = newBrowser
      return newBrowser
    }

    return new PuppeteerCore(options, browser, restart)
  },
  /**
   * 连接到一个已启动的浏览器实例
   * @param options - 连接选项
   * @returns PuppeteerCore 实例
   */
  connect: async (options: PuppeteerConnectOptions) => {
    const browserURL = options.baseUrl || options.browserURL
    const browser = await puppeteer.connect({ ...options, browserURL })
    browsers.push(browser)

    let currentBrowser = browser
    const restart = async () => {
      const newBrowser = await puppeteer.connect({ ...options, browserURL })
      /** 替换掉旧的浏览器实例 */
      const index = browsers.indexOf(currentBrowser)
      index > -1 ? browsers[index] = newBrowser : browsers.push(newBrowser)
      currentBrowser = newBrowser
      return newBrowser
    }

    return new PuppeteerCore(options, browser, restart)
  },
}
