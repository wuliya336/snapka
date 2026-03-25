import debug from 'debug'
import pLimit from 'p-limit'
import { getArray, isNumber, toInteger } from './util'
import type { Browser, Page, WaitForOptions } from '@snapka/puppeteer-core'
import type { PuppeteerConnectOptions, PuppeteerLaunchOptions } from './launch'
import type { SnapkaScreenshotOptions, SnapkaScreenshotViewportOptions } from '@snapka/types'

const log = debug('snapka:puppeteer')

/**
 * Puppeteer 核心引擎实现
 * @public
 */
export class PuppeteerCore {
  /**
   * Puppeteer 浏览器实例
   * @remarks 用于创建和管理页面，执行浏览器级别的操作
   */
  browser: Browser

  /**
   * 启动或连接时的配置参数
   * @remarks 保存初始化时的配置，用于获取执行路径等信息
   */
  private readonly options: PuppeteerLaunchOptions | PuppeteerConnectOptions

  /**
   * 重启函数：用于重新启动或连接浏览器
   * @remarks 在创建实例时由外部传入，支持 launch 和 connect 两种模式
   */
  private readonly restartFn: () => Promise<Browser>

  /**
   * 页面池：存储空闲的可复用页面
   * @remarks
   * - 在复用模式下，释放的页面会被放入此池中等待下次使用
   * - 使用数组实现，通过 pop() 获取页面，push() 归还页面
   * - 池的大小受 maxOpenPages 限制
   */
  private readonly pagePool: Page[] = []

  /**
   * 活跃页面集合：跟踪当前正在使用的页面
   * @remarks
   * - 用于追踪所有正在执行截图任务的页面
   * - 使用 Set 数据结构确保页面唯一性和快速查找
   * - 在页面获取时添加，在页面释放时移除
   */
  private readonly activePages: Set<Page> = new Set()

  /**
   * 页面空闲时间记录表
   * @remarks
   * - 记录每个页面进入空闲池的时间戳（毫秒）
   * - 用于实现空闲超时自动清理机制
   * - Key: 页面实例，Value: 进入空闲池的时间戳
   */
  private readonly pageIdleTimes: Map<Page, number> = new Map()

  /**
   * 最大同时打开的页面数量
   * @remarks
   * - 控制并发数量，防止资源耗尽
   * - 默认值为 10，可通过配置覆盖
   * - 同时也是页面池的最大容量
   */
  private readonly maxOpenPages: number

  /**
   * 页面管理模式
   * @remarks
   * - `'reuse'`: 复用模式，页面会被放回池中供下次使用（默认，推荐）
   * - `'disposable'`: 一次性模式，每次截图后立即销毁页面
   * - 复用模式性能更好，一次性模式隔离性更强
   */
  private readonly pageMode: 'reuse' | 'disposable'

  /**
   * 页面空闲超时时间（毫秒）
   * @remarks
   * - 页面在池中空闲超过此时间后会被自动销毁
   * - 默认值为 60000（60秒）
   * - 设置为 0 表示永不超时
   * - 仅在复用模式下生效
   */
  private readonly pageIdleTimeout: number

  /**
   * 并发限制器
   * @remarks
   * - 使用 p-limit 库实现并发控制
   * - 限制同时执行的截图任务数量为 maxOpenPages
   * - 超出限制的任务会自动排队等待
   */
  private readonly limit: ReturnType<typeof pLimit>

  /**
   * 空闲页面检查定时器
   * @remarks
   * - 每 30 秒执行一次空闲页面清理
   * - 仅在复用模式且设置了超时时间时启动
   * - 在 close() 时会被清理
   */
  private idleCheckTimer?: NodeJS.Timeout

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
    options: PuppeteerLaunchOptions | PuppeteerConnectOptions,
    browser: Browser,
    restartFn: () => Promise<Browser>
  ) {
    this.browser = browser
    this.options = options
    this.restartFn = restartFn
    this.maxOpenPages = isNumber(options.maxOpenPages) ? options.maxOpenPages : 10
    this.pageMode = options.pageMode || 'reuse'
    this.pageIdleTimeout = isNumber(options.pageIdleTimeout) ? options.pageIdleTimeout : 60000
    this.limit = pLimit(this.maxOpenPages)

    if (this.shouldStartIdleCheck()) {
      this.startIdleCheck()
    }

    this.setupCrashRecovery()
  }

  /**
   * 获取当前使用的浏览器引擎类型
   * @returns 引擎名称
   */
  get engine (): string {
    return 'puppeteer'
  }

  /**
   * 获取当前浏览器二进制路径
   * @remarks 在 WebSocket 连接模式下无法获取此路径
   * @returns 浏览器可执行文件路径，连接模式下返回 null
   */
  executablePath (): string | null {
    if ('baseUrl' in this.options) return null
    return (this.options as PuppeteerLaunchOptions).executablePath || null
  }

  /**
   * 重启浏览器实例
   * @remarks 关闭当前浏览器并使用相同配置重新启动
   */
  async restart (): Promise<void> {
    this.isIntentionalDisconnect = true
    this.stopIdleCheck()
    await this.closeAllPages()
    await this.browser.close().catch(() => { })
    const newBrowser = await this.restartFn()
    this.browser = newBrowser
    this.isIntentionalDisconnect = false

    if (this.shouldStartIdleCheck()) {
      this.startIdleCheck()
    }

    this.setupCrashRecovery()
  }

  /**
   * 销毁当前浏览器实例并清理所有资源
   */
  async close (): Promise<void> {
    this.isIntentionalDisconnect = true
    this.stopIdleCheck()
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
          // 添加指数退避延迟
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
  private convertWaitUntil (waitUntil?: string): WaitForOptions['waitUntil'] {
    const waitUntilMap: Record<string, WaitForOptions['waitUntil']> = {
      commit: 'domcontentloaded',
      networkidle: 'networkidle0',
    }
    return waitUntilMap[waitUntil || ''] || (waitUntil as WaitForOptions['waitUntil']) || 'load'
  }

  /**
   * 判断是否需要启动空闲检查
   */
  private shouldStartIdleCheck (): boolean {
    return this.pageMode === 'reuse' && this.pageIdleTimeout > 0
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
        this.stopIdleCheck()
        this.pagePool.length = 0
        this.activePages.clear()
        this.pageIdleTimes.clear()

        const newBrowser = await this.restartFn()
        this.browser = newBrowser
        this.setupCrashRecovery()

        if (this.shouldStartIdleCheck()) {
          this.startIdleCheck()
        }

        log('浏览器重启成功')
      } catch (error) {
        log('浏览器重启失败: %O', error)
      } finally {
        this.isRestarting = false
      }
    })
  }

  /**
   * 启动空闲页面检查定时器
   * @remarks 每 30 秒检查一次空闲页面
   */
  private startIdleCheck (): void {
    this.idleCheckTimer = setInterval(() => this.cleanIdlePages(), 30000)
  }

  /**
   * 停止空闲检查定时器
   */
  private stopIdleCheck (): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer)
      this.idleCheckTimer = undefined
    }
  }

  /**
   * 清理超时的空闲页面
   */
  private async cleanIdlePages (): Promise<void> {
    const now = Date.now()
    const expiredPages = this.pagePool.filter(page => {
      const idleTime = this.pageIdleTimes.get(page)
      return idleTime && now - idleTime > this.pageIdleTimeout
    })

    for (const page of expiredPages) {
      const index = this.pagePool.indexOf(page)
      if (index > -1) this.pagePool.splice(index, 1)
      this.pageIdleTimes.delete(page)
      await page.close().catch(() => { })
    }
  }

  /**
   * 关闭所有页面并清理资源
   */
  private async closeAllPages (): Promise<void> {
    const allPages = [...this.pagePool, ...this.activePages]
    await Promise.all(allPages.map(page => page.close().catch(() => { })))
    this.pagePool.length = 0
    this.activePages.clear()
    this.pageIdleTimes.clear()
  }

  /**
   * 从页面池获取或创建新页面
   */
  private async acquirePage (): Promise<Page> {
    const page = this.pagePool.pop()
    if (page) {
      this.pageIdleTimes.delete(page)
      this.activePages.add(page)
      return page
    }

    const newPage = await this.browser.newPage()
    this.activePages.add(newPage)
    return newPage
  }

  /**
   * 释放页面回页面池或关闭
   * @param page - 要释放的页面实例
   */
  private async releasePage (page: Page): Promise<void> {
    this.activePages.delete(page)

    if (this.pageMode === 'disposable') {
      await page.close().catch(() => { })
      return
    }

    await this.returnPageToPool(page)
  }

  /**
   * 将页面返回到页面池
   * @param page - 要返回的页面实例
   */
  private async returnPageToPool (page: Page): Promise<void> {
    if (this.pagePool.length >= this.maxOpenPages) {
      await page.close().catch(() => { })
      return
    }

    try {
      await page.goto('about:blank')
      this.pagePool.push(page)
      this.pageIdleTimes.set(page, Date.now())
    } catch {
      await page.close().catch(() => { })
    }
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
    const screenshotOptions = {
      ...options,
      omitBackground: options.omitBackground ?? (!!(options.type === 'png' || !options.type)),
    }
    return await page.screenshot(screenshotOptions) as T extends 'base64' ? string : Uint8Array
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
    const screenshotOptions = {
      ...options,
      omitBackground: options.omitBackground ?? (!!(options.type === 'png' || !options.type)),
    }
    return await element.screenshot(screenshotOptions) as T extends 'base64' ? string : Uint8Array
  }

  /**
   * 捕获视口分片
   * @param element - 要截图的元素
   * @param options - 截图配置选项
   * @returns 分片截图数据数组
   */
  private async captureViewportSlices<T extends 'base64' | 'binary'> (
    page: Page,
    element: Awaited<ReturnType<Page['$']>>,
    options: SnapkaScreenshotViewportOptions<T>
  ): Promise<(string | Uint8Array)[]> {
    const box = await element!.boundingBox()
    if (!box) return []

    const { x: boxX = 0, y: boxY = 0, width: boxWidth = 1200, height: boxHeight = 2000 } = box
    const viewportHeight = Math.max(toInteger(options.viewportHeight, 2000), 1)
    const totalPages = Math.ceil(boxHeight / viewportHeight)
    const data: (string | Uint8Array)[] = []

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const { y, height } = this.calculatePageDimensions(pageIndex, viewportHeight, boxHeight)
      const img = await page.screenshot({
        ...options,
        omitBackground: options.omitBackground ?? (!!(options.type === 'png' || !options.type)),
        clip: { x: boxX, y: boxY + y, width: boxWidth, height },
        captureBeyondViewport: true,
      }) as T extends 'base64' ? string : Uint8Array
      data.push(img)
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
      timeout: timeout > 0 ? timeout : 30000, // 不允许设置0超时
      waitUntil: this.convertWaitUntil(pageGotoParams?.waitUntil),
    }
  }

  /**
   * 检查元素是否存在
   * @param page - 页面实例
   * @param selector - 选择器
   */
  private async checkElement (page: Page, selector: string): Promise<boolean> {
    const result = await page.$(selector).catch(() => null)
    return !!result
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
      () => page.waitForSelector(selector, { timeout }),
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
      const element = await page.$(sel)
      if (element) return element
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
