# @snapka/playwright

Playwright 截图引擎 — Snapka 的核心包之一，基于 Playwright 提供高性能页面截图能力。

## 源码分析

### 模块结构

| 文件 | 作用 |
|------|------|
| `index.ts` | 入口文件，导出 `snapka` 对象（`launch` / `connect`） |
| `core.ts` | `PlaywrightCore` 类 — 基于 BrowserContext 的截图引擎 |
| `launch.ts` | `PlaywrightLaunch` 类 — 浏览器路径解析、查找、下载 |
| `util.ts` | 工具函数 — `isNumber`、`getArray`、`toInteger` |

### 核心类: PlaywrightCore

与 Puppeteer 版本的关键差异：

- **使用 BrowserContext** — 通过 `initialPage` 保活，而非页面池
- **每次创建新页面** — 截图完成后立即关闭
- **webp 自动降级** — Playwright 不支持 webp，自动转为 png
- **Locator API** — 使用 `page.locator()` 而非 `page.$()`

```ts
// Playwright 特有：保活 Context
const context = await browser.newContext({ viewport })
const initialPage = await context.newPage()
```

### 启动器: PlaywrightLaunch

与 Puppeteer 版本结构相同，共享 `@snapka/browser-finder` 和 `@snapka/puppeteer-browsers`。

## 使用说明

### 安装

```bash
pnpm add @snapka/playwright
```

### 启动浏览器

```ts
import { snapka } from '@snapka/playwright'

const core = await snapka.launch({
  headless: 'new',
  maxOpenPages: 10,
  defaultViewport: { width: 1280, height: 720 },
})
```

### 截图

```ts
const buffer = await core.screenshot({
  file: 'https://example.com',
  type: 'png',
  fullPage: true,
  playwright: {
    animations: 'disabled',
    caret: 'hide',
    scale: 'device',
  },
})
```

### Playwright 专属参数

```ts
interface PlaywrightOptions {
  animations?: 'disabled' | 'allow'  // 禁用动画
  caret?: 'hide' | 'initial'         // 隐藏光标
  maskColor?: string                  // 遮罩颜色
  scale?: 'css' | 'device'           // 缩放模式
  style?: string                      // 自定义样式
  timeout?: number                    // 超时时间
}
```

## 构建

```bash
cd packages/playwright
pnpm build
```

## 测试

```bash
cd packages/playwright
pnpm test
pnpm test:coverage
```

### 测试覆盖

| 测试文件 | 覆盖内容 |
|----------|----------|
| `index.test.ts` | `snapka.launch()` / `snapka.connect()` 入口 |
| `launch.test.ts` | 路径解析、浏览器查找、下载、镜像探针 |
| `util.test.ts` | 工具函数 |
