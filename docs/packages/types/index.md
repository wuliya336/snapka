# @snapka/types

共享类型定义包 — 为 Puppeteer 和 Playwright 引擎提供统一的接口类型。

## 源码分析

本包是纯类型定义包，不包含运行时代码。所有接口定义在 `src/index.ts` 中。

### 核心类型

#### ScreenshotOptions

截图基础参数，被 `SnapkaScreenshotOptions` 继承：

```ts
interface ScreenshotOptions {
  type?: 'png' | 'jpeg' | 'webp'
  selector?: string           // 默认 '#container'
  quality?: number            // 0-100
  fullPage?: boolean
  omitBackground?: boolean
  path?: string
  clip?: { x, y, width, height, scale? }
  retry?: number              // 默认 1
  playwright?: PlaywrightOptions
}
```

#### SnapkaScreenshotOptions

截图完整参数，增加页面导航和等待控制：

```ts
interface SnapkaScreenshotOptions<T extends 'base64' | 'binary'> {
  file: string                // 页面地址 (file:// 或 http://)
  encoding?: T
  headers?: Record<string, string>
  pageGotoParams?: {
    timeout?: number
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | ...
  }
  waitForSelector?: string | string[]
  waitForFunction?: string | string[]
  waitForRequest?: string | string[]
  waitForResponse?: string | string[]
}
```

#### LaunchOptions

浏览器启动配置：

```ts
interface LaunchOptions {
  executablePath?: string
  headless?: 'new' | 'shell' | 'false'
  findBrowser?: boolean       // 默认 true
  maxOpenPages?: number       // 默认 10
  pageMode?: 'reuse' | 'disposable'
  pageIdleTimeout?: number    // 默认 60000
  download?: DownloadConfig
  defaultViewport?: { width, height }
}
```

#### ConnectOptions

远程浏览器连接配置：

```ts
interface ConnectOptions {
  baseUrl: string
  headers?: Record<string, string>
}
```

## 使用说明

```bash
pnpm add @snapka/types
```

```ts
import type { ScreenshotOptions, LaunchOptions } from '@snapka/types'
```

## 测试

```bash
pnpm test
```

使用 `expectTypeOf` 进行编译时类型检查，确保所有接口字段正确。
