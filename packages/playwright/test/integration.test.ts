/**
 * Playwright 集成测试
 * 使用真实浏览器进行端到端测试
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { snapka } from '../src/index'
import type { PlaywrightCore } from '../src/core'

/** 检查 PNG 文件签名 */
function isPNG (data: Uint8Array): boolean {
  return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
}

/** 检查 JPEG 文件签名 */
function isJPEG (data: Uint8Array): boolean {
  return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
}

const BASIC_HTML = 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body><h1>Snapka Test</h1><p>Integration test</p></body></html>'
const ELEMENT_HTML = 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body style="margin:0"><div id="container" style="width:800px;height:600px;background:linear-gradient(red,blue)">test</div></body></html>'
const TALL_HTML = 'data:text/html;charset=utf-8,<!DOCTYPE html><html><body style="margin:0;padding:0"><div id="container" style="width:800px;height:5000px;background:linear-gradient(to bottom,red,blue)">tall content</div></body></html>'

describe('Playwright Integration Tests', () => {
  let instance: PlaywrightCore
  let available = false

  beforeAll(async () => {
    try {
      instance = await snapka.launch()
      available = true
    } catch {
      console.warn('⚠ 跳过集成测试: 未找到可用的浏览器')
    }
  }, 30000)

  afterAll(async () => {
    if (available) {
      await instance.close().catch(() => {})
    }
  }, 10000)

  describe('基本截图', () => {
    it('应返回有效的 PNG 图片', async () => {
      if (!available) return
      const { run } = await instance.screenshot({ file: BASIC_HTML, fullPage: true })
      const data = await run()
      expect(data).toBeInstanceOf(Uint8Array)
      expect(data.length).toBeGreaterThan(100)
      expect(isPNG(data)).toBe(true)
    }, 15000)

    it('fullPage 截图应返回有效 PNG', async () => {
      if (!available) return
      const { run } = await instance.screenshot({ file: BASIC_HTML, fullPage: true })
      const data = await run()
      expect(isPNG(data)).toBe(true)
    }, 15000)

    it('元素截图应返回有效 PNG', async () => {
      if (!available) return
      const { run } = await instance.screenshot({
        file: ELEMENT_HTML,
        selector: '#container',
      })
      const data = await run()
      expect(data).toBeInstanceOf(Uint8Array)
      expect(isPNG(data)).toBe(true)
    }, 15000)
  })

  describe('图片格式', () => {
    it('JPEG 截图应返回有效 JPEG', async () => {
      if (!available) return
      const { run } = await instance.screenshot({
        file: BASIC_HTML,
        fullPage: true,
        type: 'jpeg',
        quality: 80,
      })
      const data = await run()
      expect(isJPEG(data)).toBe(true)
    }, 15000)

    it('JPEG 与 PNG 大小不同', async () => {
      if (!available) return
      const pngResult = await instance.screenshot({
        file: BASIC_HTML,
        fullPage: true,
        type: 'png',
      })
      const pngData = await pngResult.run()

      const jpegResult = await instance.screenshot({
        file: BASIC_HTML,
        fullPage: true,
        type: 'jpeg',
        quality: 50,
      })
      const jpegData = await jpegResult.run()

      expect(isPNG(pngData)).toBe(true)
      expect(isJPEG(jpegData)).toBe(true)
      expect(pngData.length).not.toBe(jpegData.length)
    }, 20000)
  })

  describe('编码', () => {
    it('base64 编码应返回有效字符串', async () => {
      if (!available) return
      const { run } = await instance.screenshot({
        file: BASIC_HTML,
        fullPage: true,
        encoding: 'base64',
      })
      const data = await run()
      expect(typeof data).toBe('string')
      expect((data as unknown as string).length).toBeGreaterThan(0)

      // 验证 base64 可解码为有效 PNG
      const buffer = Buffer.from(data as unknown as string, 'base64')
      expect(buffer[0]).toBe(0x89) // PNG signature
    }, 15000)
  })

  describe('视口分片截图', () => {
    it('应返回多个分片', async () => {
      if (!available) return
      const { run } = await instance.screenshotViewport({
        file: TALL_HTML,
        selector: '#container',
        viewportHeight: 1000,
      })
      const slices = await run()

      expect(Array.isArray(slices)).toBe(true)
      // 5000px / 1000px = 5 个分片
      expect(slices.length).toBe(5)

      // 每个分片都是有效的 PNG
      for (const slice of slices) {
        expect(slice).toBeInstanceOf(Uint8Array)
        expect(isPNG(slice as Uint8Array)).toBe(true)
        expect(slice.length).toBeGreaterThan(100)
      }
    }, 30000)

    it('不同 viewportHeight 应产生不同数量分片', async () => {
      if (!available) return
      const { run: run1 } = await instance.screenshotViewport({
        file: TALL_HTML,
        selector: '#container',
        viewportHeight: 1000,
      })
      const slices1 = await run1()

      const { run: run2 } = await instance.screenshotViewport({
        file: TALL_HTML,
        selector: '#container',
        viewportHeight: 2500,
      })
      const slices2 = await run2()

      // 5000/1000 = 5 片, 5000/2500 = 2 片
      expect(slices1.length).toBe(5)
      expect(slices2.length).toBe(2)
    }, 30000)

    it('base64 编码分片应返回字符串数组', async () => {
      if (!available) return
      const { run } = await instance.screenshotViewport({
        file: TALL_HTML,
        selector: '#container',
        viewportHeight: 2000,
        encoding: 'base64',
      })
      const slices = await run()

      expect(slices.length).toBeGreaterThan(1)
      for (const slice of slices) {
        expect(typeof slice).toBe('string')
        const buffer = Buffer.from(slice as string, 'base64')
        expect(buffer[0]).toBe(0x89) // PNG
      }
    }, 30000)
  })

  describe('重启', () => {
    it('restart 后应能正常截图', async () => {
      if (!available) return
      await instance.restart()

      const { run } = await instance.screenshot({ file: BASIC_HTML, fullPage: true })
      const data = await run()
      expect(isPNG(data)).toBe(true)
    }, 30000)
  })

  describe('崩溃恢复', () => {
    it('浏览器意外断开后应自动恢复', async () => {
      if (!available) return

      // Playwright 不暴露进程句柄，通过内部方式模拟意外断开
      // 先重置 intentional flag，然后强制关闭底层连接
      ;(instance as any).isIntentionalDisconnect = false
      ;(instance as any).isRestarting = false

      // 使用 Playwright 内部 API 强制断开连接
      try {
        await instance.browser.close()
      } catch {
        // 关闭可能抛异常
      }

      // 等待自动恢复完成
      await new Promise(resolve => setTimeout(resolve, 5000))

      // 验证恢复后可正常截图
      const { run } = await instance.screenshot({ file: BASIC_HTML, fullPage: true })
      const data = await run()
      expect(data).toBeInstanceOf(Uint8Array)
      expect(isPNG(data)).toBe(true)
    }, 30000)
  })
})
