import debug from 'debug'
import pLimit from 'p-limit'
import { getArray, isNumber, toInteger } from './util'
import type { Browser, Page, BrowserContext } from 'playwright-core'
import type { PlaywrightLaunchOptions, PlaywrightConnectOptions } from './launch'
import type { SnapkaScreenshotOptions, SnapkaScreenshotViewportOptions } from '@snapka/types'

const log = debug('snapka:playwright')

/**
 * Playwright 核心引擎实现
 * @public
 */
export class PlaywrightCore {
  /**
   * Playwright 浏览器实例
   * @remarks 用于创建和管理页面，执行浏览器级别的操作
   */
  browser: Browser

  /**
   * 浏览器上下文实例
   * @remarks 所有页面都在这个上下文中创建，类似 Puppeteer 的浏览器实例
   */
  private context: BrowserContext

  /**
   * 初始页面
   * @remarks 保持一个初始页面以维持 Context 窗口存活，避免每次 newPage 时重建窗口导致性能下降
   */
  private initialPage: Page

  /**
   * 活跃页面集合：跟踪当前正在使用的页面
   * @remarks
   * - 用于追踪所有正在执行截图任务的页面
   * - 使用 Set 数据结构确保页面唯一性和快速查找
   * - 在页面获取时添加，在页面释放时移除
   */
  private readonly activePages: Set<Page> = new Set()

  /**
   * 启动或连接时的配置参数
   * @remarks 保存初始化时的配置，用于获取执行路径等信息
   */
  private readonly options: PlaywrightLaunchOptions | PlaywrightConnectOptions

  /**
   * 重启函数：用于重新启动或连接浏览器
   * @remarks 在创建实例时由外部传入，支持 launch 和 connect 两种模式
   */
  private readonly restartFn: () => Promise<Browser>

  /**
   * 最大同时打开的页面数量
   * @remarks
   * - 控制并发数量，防止资源耗尽
   * - 默认值为 10，可通过配置覆盖
   */
  private readonly maxOpenPages: number

  /**
   * 并发限制器
   * @remarks
   * - 使用 p-limit 库实现并发控制
   * - 限制同时执行的截图任务数量为 maxOpenPages
   * - 超出限制的任务会自动排队等待
   */
  private readonly limit: ReturnType<typeof pLimit>

  /**
   * 标记是否为主动断开连接（restart/close）
   * @remarks 用于区分主动关闭和意外崩溃，避免触发自动重启
   */
  private isIntentionalDisconnect = false

  /**
   * 标记是否正在重启中
   * @remarks 防止并发重启
   */
  private isRestarting = false

  constructor (
    options: PlaywrightLaunchOptions | PlaywrightConnectOptions,
    browser: Browser,
    restartFn: () => Promise<Browser>,
    context: BrowserContext,
    initialPage: Page
  ) {
    this.browser = browser
    this.context = context
    this.initialPage = initialPage
    this.options = options
    this.restartFn = restartFn
    this.maxOpenPages = isNumber(options.maxOpenPages) && options.maxOpenPages > 0 ? options.maxOpenPages : 10
    this.limit = pLimit(this.maxOpenPages)

    this.setupCrashRecovery()
  }

  /**
   * 获取当前使用的浏览器引擎类型
   * @returns 引擎名称
   */
  get engine (): string {
    return 'playwright'
  }

  /**
   * 获取当前浏览器二进制路径
   * @remarks 在 WebSocket 连接模式下无法获取此路径
   * @returns 浏览器可执行文件路径，连接模式下返回 null
   */
  executablePath (): string | null {
    if ('baseUrl' in this.options) return null
    return (this.options as PlaywrightLaunchOptions).executablePath || null
  }

  /**
   * 重启浏览器实例
   * @remarks 关闭旧 Context 并在同一浏览器进程上重新创建，比关闭/重启浏览器进程更快、更可靠。
   *          如需完整进程级重启，请调用 close() 后重新 launch()。
   *          浏览器进程意外崩溃时由 setupCrashRecovery 负责完整重启。
   */
  async restart (): Promise<void> {
    this.isIntentionalDisconnect = true
    await this.closeAllPages()
    await this.context.close().catch(() => { })
    this.context = await this.browser.newContext({
      viewport: this.options.defaultViewport || { width: 800, height: 600 },
    })
    this.initialPage = await this.context.newPage()
    this.isIntentionalDisconnect = false
  }

  /**
   * 销毁当前浏览器实例并清理所有资源
   */
  async close (): Promise<void> {
    this.isIntentionalDisconnect = true
    await this.closeAllPages()
    await this.browser.close()
  }

  /**
   * 执行页面截图
   * @param options - 截图配置选项
   * @returns 包含截图执行函数、页面实例和浏览器实例的对象
   */
  async screenshot<T extends 'base64' | 'binary' = 'binary'> (
    options: SnapkaScreenshotOptions<T>
  ): Promise<{ run: () => Promise<T extends 'base64' ? string : Uint8Array>, page: Page, browser: Browser }> {
    const retryCount = toInteger(options.retry, 1)

    return this.limit(async () => {
      const { page, timeout } = await this.preparePage(options)

      const run = async () => {
        const executeScreenshot = async () => {
          await this.waitForConditions(page, options, timeout)
          this.normalizeQuality(options)

          const data = options.fullPage
            ? await this.screenshotFullPage(page, options)
            : await this.screenshotElement(page, options)

          return data
        }

        try {
          const data = await this.retryExecute(executeScreenshot, retryCount, '截图')
          return data
        } finally {
          await this.releasePage(page)
        }
      }

      return { run, page, browser: this.browser }
    })
  }

  /**
   * 执行分片截图
   * @param options - 分片截图配置选项
   * @returns 包含截图执行函数、页面实例和浏览器实例的对象
   */
  async screenshotViewport<T extends 'base64' | 'binary' = 'binary'> (
    options: SnapkaScreenshotViewportOptions<T>
  ): Promise<{ run: () => Promise<T extends 'base64' ? string[] : Uint8Array[]>, page: Page, browser: Browser }> {
    const retryCount = toInteger(options.retry, 1)

    return this.limit(async () => {
      const { page, timeout } = await this.preparePage(options)

      const run = async () => {
        const executeScreenshot = async () => {
          await this.waitForConditions(page, options, timeout)
          this.normalizeQuality(options)

          const element = await this.findElement(page, options.selector)
          if (!element) throw new Error('当前页面未找到任何可截图的元素')

          const data = await this.captureViewportSlices(page, element, options)
          return data as T extends 'base64' ? string[] : Uint8Array[]
        }

        try {
          const data = await this.retryExecute(executeScreenshot, retryCount, '分片截图')
          return data
        } finally {
          await this.releasePage(page)
        }
      }

      return { run, page, browser: this.browser }
    })
  }

  /**
   * 重试执行函数
   * @param fn - 要执行的函数
   * @param maxRetries - 最大重试次数
   * @param operation - 操作名称（用于日志）
   * @returns 执行结果
   */
  private async retryExecute<T> (
    fn: () => Promise<T>,
    maxRetries: number,
    operation: string
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries) {
          log(`${operation}失败 (第 ${attempt}/${maxRetries} 次尝试): ${lastError.message}，正在重试...`)
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)))
        }
      }
    }

    throw new Error(`${operation}在 ${maxRetries} 次尝试后仍然失败: ${lastError?.message || '未知错误'}`)
  }

  /**
   * 转换 waitUntil 参数
   * @param waitUntil - 原始 waitUntil 参数
   * @returns 转换后的 waitUntil 参数
   */
  private convertWaitUntil (waitUntil?: string): 'load' | 'domcontentloaded' | 'networkidle' | 'commit' {
    const waitUntilMap: Record<string, 'load' | 'domcontentloaded' | 'networkidle' | 'commit'> = {
      networkidle0: 'networkidle',
      networkidle2: 'networkidle',
    }
    return waitUntilMap[waitUntil || ''] || (waitUntil as any) || 'load'
  }

  /**
   * 关闭所有页面并清理资源
   */
  private async closeAllPages (): Promise<void> {
    const allPages = [...this.activePages]
    await Promise.all(allPages.map(page => page.close().catch(() => { })))
    this.activePages.clear()
    await this.initialPage.close().catch(() => { })
  }

  /**
   * 设置浏览器崩溃自动恢复
   * @remarks 监听浏览器 disconnected 事件，在意外断开时自动重启
   */
  private setupCrashRecovery (): void {
    this.browser.on('disconnected', async () => {
      if (this.isIntentionalDisconnect || this.isRestarting) return

      this.isRestarting = true
      log('浏览器意外断开连接，正在尝试重启...')

      try {
        this.activePages.clear()

        const newBrowser = await this.restartFn()
        this.browser = newBrowser
        this.context = await newBrowser.newContext({
          viewport: this.options.defaultViewport || { width: 800, height: 600 },
        })
        this.initialPage = await this.context.newPage()
        this.setupCrashRecovery()

        log('浏览器重启成功')
      } catch (error) {
        log('浏览器重启失败: %O', error)
      } finally {
        this.isRestarting = false
      }
    })
  }

  /**
   * 创建新页面
   */
  private async acquirePage (): Promise<Page> {
    if (this.isRestarting || !this.browser.isConnected()) {
      throw new Error('浏览器已断开连接或正在重启中，请稍后重试')
    }

    const page = await this.context.newPage()
    this.activePages.add(page)
    return page
  }

  /**
   * 释放页面
   * @param page - 要释放的页面实例
   */
  private async releasePage (page: Page): Promise<void> {
    this.activePages.delete(page)
    await page.close().catch(() => { })
  }

  /**
   * 截取完整页面
   * @param page - 页面实例
   * @param options - 截图配置选项
   * @returns 截图数据
   */
  private async screenshotFullPage<T extends 'base64' | 'binary'> (
    page: Page,
    options: SnapkaScreenshotOptions<T>
  ): Promise<T extends 'base64' ? string : Uint8Array> {
    const type = options.type === 'webp' ? 'png' : options.type
    const screenshotOptions: any = {
      type,
      quality: options.quality,
      fullPage: true,
      omitBackground: options.omitBackground ?? (type === 'png'),
      path: options.path,
      ...(options.playwright || {}),
    }

    const buffer = await page.screenshot(screenshotOptions)
    if (options.encoding === 'base64') {
      return Buffer.from(buffer).toString('base64') as any
    }
    return buffer as any
  }

  /**
   * 截取指定元素
   * @param page - 页面实例
   * @param options - 截图配置选项
   * @returns 截图数据
   */
  private async screenshotElement<T extends 'base64' | 'binary'> (
    page: Page,
    options: SnapkaScreenshotOptions<T>
  ): Promise<T extends 'base64' ? string : Uint8Array> {
    const element = await this.findElement(page, options.selector)
    if (!element) throw new Error('当前页面未找到任何可截图的元素')

    const type = options.type === 'webp' ? 'png' : options.type
    const screenshotOptions: any = {
      type,
      quality: options.quality,
      omitBackground: options.omitBackground ?? (type === 'png'),
      path: options.path,
      ...(options.playwright || {}),
    }

    const buffer = await element.screenshot(screenshotOptions)
    if (options.encoding === 'base64') {
      return Buffer.from(buffer).toString('base64') as any
    }
    return buffer as any
  }

  /**
   * 捕获视口分片
   * @param element - 要截图的元素
   * @param options - 截图配置选项
   * @returns 分片截图数据数组
   */
  private async captureViewportSlices<T extends 'base64' | 'binary'> (
    page: Page,
    element: Awaited<ReturnType<Page['locator']>>,
    options: SnapkaScreenshotViewportOptions<T>
  ): Promise<(string | Uint8Array)[]> {
    const box = await element.boundingBox()
    if (!box) return []

    const { x: boxX = 0, y: boxY = 0, width: boxWidth = 1200, height: boxHeight = 2000 } = box
    const viewportHeight = Math.max(toInteger(options.viewportHeight, 2000), 1)
    const totalPages = Math.ceil(boxHeight / viewportHeight)
    const data: (string | Uint8Array)[] = []
    const type = options.type === 'webp' ? 'png' : options.type

    // Playwright 的 clip 坐标必须在视口范围内，
    // 临时调整视口高度以覆盖整个元素区域（等效于 Puppeteer 的 captureBeyondViewport: true）
    const originalViewport = page.viewportSize() || { width: 1280, height: 800 }
    const requiredHeight = Math.ceil(boxY + boxHeight)
    if (requiredHeight > originalViewport.height) {
      await page.setViewportSize({ width: originalViewport.width, height: requiredHeight })
    }

    try {
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const { y, height } = this.calculatePageDimensions(pageIndex, viewportHeight, boxHeight)

        const screenshotOptions: any = {
          type,
          quality: options.quality,
          omitBackground: options.omitBackground ?? (type === 'png'),
          clip: { x: boxX, y: boxY + y, width: boxWidth, height },
          ...(options.playwright || {}),
        }

        const buffer = await page.screenshot(screenshotOptions)
        if (options.encoding === 'base64') {
          data.push(Buffer.from(buffer).toString('base64'))
        } else {
          data.push(buffer)
        }
      }
    } finally {
      // 恢复原始视口大小
      await page.setViewportSize(originalViewport).catch(() => { })
    }

    return data
  }

  /**
   * 获取页面跳转参数
   * @param pageGotoParams - 原始参数
   * @returns 规范化后的跳转参数
   */
  private getPageGotoParams (pageGotoParams?: SnapkaScreenshotOptions<any>['pageGotoParams']) {
    const timeout = isNumber(pageGotoParams?.timeout) ? pageGotoParams!.timeout : 30000
    return {
      timeout: timeout > 0 ? timeout : 30000,
      waitUntil: this.convertWaitUntil(pageGotoParams?.waitUntil),
    }
  }

  /**
   * 检查元素是否存在
   * @param page - 页面实例
   * @param selector - 选择器
   */
  private async checkElement (page: Page, selector: string): Promise<boolean> {
    const result = await page.locator(selector).count().catch(() => 0)
    return result > 0
  }

  /**
   * 通用等待方法
   * @param page - 页面实例
   * @param waitFn - 等待函数
   * @param resource - 资源名称
   * @param timeout - 超时时间
   */
  private async waitForResource (
    _page: Page,
    waitFn: () => Promise<unknown>,
    resource: string,
    _timeout: number
  ): Promise<void> {
    await waitFn().catch(() => log(`${resource} 加载超时`))
  }

  /**
   * 等待指定元素加载完成
   */
  private async awaitSelector (page: Page, selector: string, timeout: number): Promise<void> {
    if (!await this.checkElement(page, selector)) return
    await this.waitForResource(
      page,
      () => page.locator(selector).waitFor({ timeout }),
      `页面元素 ${selector}`,
      timeout
    )
  }

  /**
   * 等待特定函数完成
   */
  private async awaitFunction (page: Page, func: string, timeout: number): Promise<void> {
    await this.waitForResource(
      page,
      () => page.waitForFunction(func, { timeout }),
      `函数 ${func}`,
      timeout
    )
  }

  /**
   * 等待特定请求完成
   */
  private async awaitRequest (page: Page, req: string, timeout: number): Promise<void> {
    await this.waitForResource(
      page,
      () => page.waitForRequest(req, { timeout }),
      `请求 ${req}`,
      timeout
    )
  }

  /**
   * 等待特定响应完成
   */
  private async awaitResponse (page: Page, res: string, timeout: number): Promise<void> {
    await this.waitForResource(
      page,
      () => page.waitForResponse(res, { timeout }),
      `响应 ${res}`,
      timeout
    )
  }

  /**
   * 查找可截图的元素
   * @param page - 页面实例
   * @param selector - 自定义选择器
   * @returns 元素实例或 null
   */
  private async findElement (page: Page, selector?: string) {
    const selectors = [selector, '#container', 'body'].filter((s): s is string => typeof s === 'string')

    for (const sel of selectors) {
      const count = await page.locator(sel).count()
      if (count > 0) {
        return page.locator(sel).first()
      }
    }

    return null
  }

  /**
   * 准备页面并跳转到指定 URL
   * @param options - 截图配置选项
   * @returns 页面实例和超时时间
   * @throws {TypeError} 当 file 参数无效时
   */
  private async preparePage<T extends 'base64' | 'binary'> (
    options: SnapkaScreenshotOptions<T> | SnapkaScreenshotViewportOptions<T>
  ): Promise<{ page: Page, timeout: number }> {
    if (!options.file || typeof options.file !== 'string') {
      throw new TypeError('参数 file 必须是一个有效的字符串，表示要截图的页面 URL')
    }

    const page = await this.acquirePage()

    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers)
    }

    const pageGotoParams = this.getPageGotoParams(options.pageGotoParams)
    await page.goto(options.file, pageGotoParams)

    return { page, timeout: pageGotoParams.timeout }
  }

  /**
   * 等待所有配置的条件完成
   * @param page - 页面实例
   * @param options - 截图配置选项
   * @param timeout - 超时时间
   */
  private async waitForConditions<T extends 'base64' | 'binary'> (
    page: Page,
    options: SnapkaScreenshotOptions<T> | SnapkaScreenshotViewportOptions<T>,
    timeout: number
  ): Promise<void> {
    const targets = [
      getArray(options.waitForSelector).map(val => this.awaitSelector(page, val, timeout)),
      getArray(options.waitForFunction).map(val => this.awaitFunction(page, val, timeout)),
      getArray(options.waitForRequest).map(val => this.awaitRequest(page, val, timeout)),
      getArray(options.waitForResponse).map(val => this.awaitResponse(page, val, timeout)),
    ]

    await Promise.allSettled(targets.flat())
  }

  /**
   * 规范化截图质量参数
   * @param options - 截图配置选项
   * @remarks PNG 格式不支持质量设置
   */
  private normalizeQuality<T extends 'base64' | 'binary'> (
    options: SnapkaScreenshotOptions<T> | SnapkaScreenshotViewportOptions<T>
  ): void {
    options.quality = options.quality && options.type !== 'png' ? options.quality : undefined
  }

  /**
   * 计算分片截图的坐标和高度
   * @param pageIndex - 当前页索引
   * @param pageHeight - 每页高度
   * @param totalHeight - 元素总高度
   * @returns 计算后的坐标和高度
   */
  private calculatePageDimensions (
    pageIndex: number,
    pageHeight: number,
    totalHeight: number
  ): { y: number, height: number } {
    const baseY = pageIndex * pageHeight
    const baseHeight = Math.min(pageHeight, totalHeight - baseY)
    const overlap = pageIndex === 0 ? 0 : 100

    return {
      y: baseY - overlap,
      height: baseHeight + overlap,
    }
  }
}
