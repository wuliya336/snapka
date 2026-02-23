import { describe, it, expectTypeOf } from 'vitest'
import type {
  ScreenshotOptions,
  SnapkaScreenshotOptions,
  SnapkaScreenshotViewportOptions,
  LaunchOptions,
  ConnectOptions,
} from '../src/index'

/**
 * @snapka/types 是纯类型定义包
 * 使用 expectTypeOf 进行编译时类型检查
 */
describe('@snapka/types 类型检查', () => {
  describe('ScreenshotOptions', () => {
    it('应该支持所有截图参数', () => {
      expectTypeOf<ScreenshotOptions>().toHaveProperty('type')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('selector')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('quality')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('fullPage')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('omitBackground')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('path')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('clip')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('retry')
      expectTypeOf<ScreenshotOptions>().toHaveProperty('playwright')
    })

    it('type 应该是联合类型', () => {
      expectTypeOf<ScreenshotOptions['type']>().toEqualTypeOf<'png' | 'jpeg' | 'webp' | undefined>()
    })
  })

  describe('SnapkaScreenshotOptions', () => {
    it('应该要求 file 字段', () => {
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('file')
    })

    it('应该支持 encoding', () => {
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('encoding')
      expectTypeOf<SnapkaScreenshotOptions<'binary'>>().toHaveProperty('encoding')
    })

    it('应该支持页面导航参数', () => {
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('pageGotoParams')
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('headers')
    })

    it('应该支持等待条件', () => {
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('waitForSelector')
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('waitForFunction')
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('waitForRequest')
      expectTypeOf<SnapkaScreenshotOptions<'base64'>>().toHaveProperty('waitForResponse')
    })
  })

  describe('SnapkaScreenshotViewportOptions', () => {
    it('应该支持 viewportHeight', () => {
      expectTypeOf<SnapkaScreenshotViewportOptions<'base64'>>().toHaveProperty('viewportHeight')
    })

    it('不应该有 fullPage 属性', () => {
      expectTypeOf<SnapkaScreenshotViewportOptions<'base64'>>().not.toHaveProperty('fullPage')
    })
  })

  describe('LaunchOptions', () => {
    it('应该支持所有启动参数', () => {
      expectTypeOf<LaunchOptions>().toHaveProperty('executablePath')
      expectTypeOf<LaunchOptions>().toHaveProperty('headless')
      expectTypeOf<LaunchOptions>().toHaveProperty('args')
      expectTypeOf<LaunchOptions>().toHaveProperty('download')
      expectTypeOf<LaunchOptions>().toHaveProperty('findBrowser')
      expectTypeOf<LaunchOptions>().toHaveProperty('maxOpenPages')
      expectTypeOf<LaunchOptions>().toHaveProperty('pageMode')
      expectTypeOf<LaunchOptions>().toHaveProperty('defaultViewport')
    })
  })

  describe('ConnectOptions', () => {
    it('应该要求 baseUrl', () => {
      expectTypeOf<ConnectOptions>().toHaveProperty('baseUrl')
    })

    it('应该支持 headers', () => {
      expectTypeOf<ConnectOptions>().toHaveProperty('headers')
    })
  })
})
