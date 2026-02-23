# 快速开始

## 安装

Snapka 采用 monorepo 结构，你可以根据需要选择合适的包：

### 使用 Puppeteer 引擎

```bash
npm install @snapka/puppeteer
# 或
pnpm add @snapka/puppeteer
```

### 使用 Playwright 引擎

```bash
npm install @snapka/playwright
# 或
pnpm add @snapka/playwright
```

## 基本用法

### Puppeteer

```ts
import { snapka } from '@snapka/puppeteer'

// 启动浏览器
const core = await snapka.launch({
  headless: 'shell',
  maxOpenPages: 10,
})

// 截图
const buffer = await core.screenshot({
  file: 'https://example.com',
  type: 'png',
  fullPage: true,
})

// 分片截图
const buffers = await core.screenshotViewport({
  file: 'https://example.com',
  type: 'png',
  viewportHeight: 800,
})
```

### Playwright

```ts
import { snapka } from '@snapka/playwright'

// 启动浏览器
const core = await snapka.launch({
  headless: 'new',
  maxOpenPages: 10,
})

// 截图
const buffer = await core.screenshot({
  file: 'https://example.com',
  type: 'png',
  fullPage: true,
})
```

### 连接远程浏览器

```ts
import { snapka } from '@snapka/puppeteer'

const core = await snapka.connect({
  baseUrl: 'http://localhost:9222',
  maxOpenPages: 5,
})

const buffer = await core.screenshot({
  file: 'https://example.com',
})
```

## 浏览器自动发现

Snapka 内置智能浏览器发现机制，按以下优先级自动查找：

1. **自定义路径** — 通过 `executablePath` 指定
2. **系统浏览器** — 查找系统已安装的 Chrome、Edge、Brave、Chromium
3. **自动下载** — 从阿里云镜像自动下载对应浏览器

```ts
// 自动查找，无需手动指定路径
const core = await snapka.launch()

// 指定路径
const core = await snapka.launch({
  executablePath: '/usr/bin/chromium',
})

// 禁用自动查找，仅下载
const core = await snapka.launch({
  findBrowser: false,
  download: { enable: true },
})
```

## 下载镜像配置

默认使用阿里云 npmmirror 作为下载源，支持自定义：

```ts
const core = await snapka.launch({
  download: {
    enable: true,
    baseUrl: 'https://registry.npmmirror.com/-/binary/chrome-for-testing',
    version: 'stable',
    browser: 'chrome-headless-shell',
  },
})
```

## 下一步

- 查看 [@snapka/puppeteer 文档](/packages/puppeteer/) 了解完整 API
- 查看 [@snapka/playwright 文档](/packages/playwright/) 了解 Playwright 引擎
- 查看 [架构概览](/guide/architecture) 了解项目整体设计
