import { Router } from '@karinjs/express'
import { browserManager } from './browser'
import type {
  ApiResponse,
  ScreenshotData,
  ScreenshotViewportData,
  ScreenshotPostBody,
  ScreenshotViewportPostBody,
  ScreenshotGetQuery,
  ScreenshotViewportGetQuery,
} from './types'
import { StatusCode } from './types'

const router = Router()

/**
 * 创建成功响应
 */
function successResponse<T> (data: T, message = '成功'): ApiResponse<T> {
  return {
    status: StatusCode.SUCCESS,
    message,
    data,
  }
}

/**
 * 创建错误响应
 */
function errorResponse (status: StatusCode, message: string, error?: string): ApiResponse {
  return {
    status,
    message,
    error,
  }
}

/**
 * 解析布尔值参数
 */
function parseBoolean (value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  return false
}

/** 禁止的 URL scheme */
const BLOCKED_SCHEMES = ['file:', 'ftp:', 'data:', 'javascript:']

/** 内网 IP 正则 */
const PRIVATE_IP_RE = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\]|\[::\])/i

/**
 * 校验 URL 安全性，防止 SSRF 攻击
 */
function validateUrl (url: string): boolean {
  try {
    const parsed = new URL(url)
    if (BLOCKED_SCHEMES.includes(parsed.protocol)) return false
    if (PRIVATE_IP_RE.test(url)) return false
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return true
  } catch {
    // 允许本地文件路径（非 URL 格式），如 /path/to/file.html
    return true
  }
}

/**
 * POST /screenshot - 普通截图
 * 支持返回JSON或流
 */
router.post('/screenshot', async (req, res) => {
  try {
    const body = req.body as ScreenshotPostBody
    const { stream = false, ...screenshotOptions } = body

    if (!screenshotOptions.file) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', 'file参数是必需的'))
      return
    }

    if (!validateUrl(screenshotOptions.file)) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', '不允许访问内部网络地址或不安全的协议'))
      return
    }

    // 使用单例浏览器进行截图
    const core = browserManager.getInstance()

    const { run } = await core.screenshot({
      ...screenshotOptions,
      file: screenshotOptions.file,
      encoding: 'base64',
    })

    const imageData = await run()

    // 根据stream参数决定返回格式
    if (stream) {
      // 返回图片流
      const buffer = Buffer.from(imageData as string, 'base64')
      const contentType = screenshotOptions.type === 'jpeg'
        ? 'image/jpeg'
        : screenshotOptions.type === 'webp'
          ? 'image/webp'
          : 'image/png'

      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.length)
      res.send(buffer)
    } else {
      // 返回JSON格式
      const data: ScreenshotData = {
        image: imageData as string,
        type: screenshotOptions.type || 'png',
      }
      res.json(successResponse(data, '截图成功'))
    }
  } catch (error) {
    console.error('[Route] 截图失败:', error)
    res.status(500).json(errorResponse(StatusCode.INTERNAL_ERROR, '截图失败', (error as Error).message))
  }
})

/**
 * POST /screenshot/viewport - 分片截图
 * 始终返回JSON格式
 */
router.post('/screenshot/viewport', async (req, res) => {
  try {
    const body = req.body as ScreenshotViewportPostBody

    if (!body.file) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', 'file参数是必需的'))
      return
    }

    if (!validateUrl(body.file)) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', '不允许访问内部网络地址或不安全的协议'))
      return
    }

    // 使用单例浏览器进行分片截图
    const core = browserManager.getInstance()

    const { run } = await core.screenshotViewport({
      ...body,
      file: body.file,
      encoding: 'base64',
    })

    const imagesData = await run()

    // 分片截图始终返回JSON
    const data: ScreenshotViewportData = {
      images: imagesData as string[],
      type: body.type || 'png',
      count: (imagesData as string[]).length,
    }

    res.json(successResponse(data, '分片截图成功'))
  } catch (error) {
    console.error('[Route] 分片截图失败:', error)
    res.status(500).json(errorResponse(StatusCode.INTERNAL_ERROR, '分片截图失败', (error as Error).message))
  }
})

/**
 * GET /screenshot - 普通截图
 * 通过URL参数控制
 */
router.get('/screenshot', async (req, res) => {
  try {
    const query = req.query as ScreenshotGetQuery

    if (!query.file) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', 'file参数是必需的'))
      return
    }

    if (!validateUrl(query.file)) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', '不允许访问内部网络地址或不安全的协议'))
      return
    }

    const stream = parseBoolean(query.stream)
    const quality = query.quality ? parseInt(query.quality, 10) : undefined

    // 使用单例浏览器进行截图
    const core = browserManager.getInstance()

    const { run } = await core.screenshot({
      file: query.file,
      type: query.type as any,
      quality,
      fullPage: parseBoolean(query.fullPage),
      selector: query.selector,
      encoding: 'base64',
    })

    const imageData = await run()

    // 根据stream参数决定返回格式
    if (stream) {
      // 返回图片流
      const buffer = Buffer.from(imageData as string, 'base64')
      const contentType = query.type === 'jpeg'
        ? 'image/jpeg'
        : query.type === 'webp'
          ? 'image/webp'
          : 'image/png'

      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.length)
      res.send(buffer)
    } else {
      // 返回JSON格式
      const data: ScreenshotData = {
        image: imageData as string,
        type: (query.type as any) || 'png',
      }
      res.json(successResponse(data, '截图成功'))
    }
  } catch (error) {
    console.error('[Route] 截图失败:', error)
    res.status(500).json(errorResponse(StatusCode.INTERNAL_ERROR, '截图失败', (error as Error).message))
  }
})

/**
 * GET /screenshot/viewport - 分片截图
 * 始终返回JSON格式
 */
router.get('/screenshot/viewport', async (req, res) => {
  try {
    const query = req.query as ScreenshotViewportGetQuery

    if (!query.file) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', 'file参数是必需的'))
      return
    }

    if (!validateUrl(query.file)) {
      res.status(400).json(errorResponse(StatusCode.BAD_REQUEST, '参数错误', '不允许访问内部网络地址或不安全的协议'))
      return
    }

    const quality = query.quality ? parseInt(query.quality, 10) : undefined
    const viewportHeight = query.viewportHeight ? parseInt(query.viewportHeight, 10) : undefined

    // 使用单例浏览器进行分片截图
    const core = browserManager.getInstance()

    const { run } = await core.screenshotViewport({
      file: query.file,
      type: query.type as any,
      quality,
      selector: query.selector,
      viewportHeight,
      encoding: 'base64',
    })

    const imagesData = await run()

    // 分片截图始终返回JSON
    const data: ScreenshotViewportData = {
      images: imagesData as string[],
      type: (query.type as any) || 'png',
      count: (imagesData as string[]).length,
    }

    res.json(successResponse(data, '分片截图成功'))
  } catch (error) {
    console.error('[Route] 分片截图失败:', error)
    res.status(500).json(errorResponse(StatusCode.INTERNAL_ERROR, '分片截图失败', (error as Error).message))
  }
})

/**
 * GET /health - 健康检查
 */
router.get('/health', (req, res) => {
  const isInitialized = browserManager.isInitialized()
  res.json(successResponse({
    status: isInitialized ? 'ok' : 'initializing',
    engine: 'puppeteer',
    browser: isInitialized ? 'ready' : 'not ready',
  }, '服务正常'))
})

/**
 * POST /browser/restart - 重启浏览器
 */
router.post('/browser/restart', async (req, res) => {
  try {
    await browserManager.restart()
    res.json(successResponse({ restarted: true }, '浏览器重启成功'))
  } catch (error) {
    console.error('[Route] 浏览器重启失败:', error)
    res.status(500).json(errorResponse(StatusCode.INTERNAL_ERROR, '浏览器重启失败', (error as Error).message))
  }
})

export default router
