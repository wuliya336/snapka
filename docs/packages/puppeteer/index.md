# @snapka/puppeteer

Puppeteer 截图引擎 — Snapka 的核心包之一，基于 Puppeteer 提供高性能页面截图能力。

## 源码分析

### 模块结构

| 文件 | 作用 |
|------|------|
| `index.ts` | 入口文件，导出 `snapka` 对象（`launch` / `connect`） |
| `core.ts` | `PuppeteerCore` 类 — 页面池管理、截图执行、重试、空闲回收 |
| `launch.ts` | `SnapkaLaunch` 类 — 浏览器路径解析、查找、下载 |
| `util.ts` | 工具函数 — `isNumber`、`getArray`、`toInteger` |

### 核心类: PuppeteerCore

`PuppeteerCore` 是截图引擎的核心，负责：

- **页面池管理** — 复用模式（reuse）和一次性模式（disposable）
- **截图执行** — 全页截图、元素截图、分片截图
- **重试机制** — 失败自动重试（可配置次数）
- **空闲回收** — 自动关闭超时空闲页面

```ts
// 页面管理模式
interface Options {
  pageMode: 'reuse' | 'disposable'  // 复用 vs 一次性
  maxOpenPages: number               // 最大并发页面数
  pageIdleTimeout: number            // 空闲超时时间（ms）
}
```

### 启动器: SnapkaLaunch

浏览器路径解析优先级：

1. `executablePath` 自定义路径
2. `browserFinder` 系统浏览器查找
3. 自动下载（镜像探针选择最快源）

## 使用说明

### 安装

```bash
pnpm add @snapka/puppeteer
```

### 启动浏览器

```ts
import { snapka } from '@snapka/puppeteer'

const core = await snapka.launch({
  headless: 'shell',         // 'shell' | 'new' | 'false'
  maxOpenPages: 10,
  pageMode: 'reuse',
  pageIdleTimeout: 60000,
})
```

### 页面截图

```ts
// 全页截图
const buffer = await core.screenshot({
  file: 'file:///path/to/page.html',
  type: 'png',
  fullPage: true,
  omitBackground: true,
})

// 元素截图
const buffer = await core.screenshot({
  file: 'https://example.com',
  selector: '#container',
  type: 'jpeg',
  quality: 90,
})

// 分片截图
const buffers = await core.screenshotViewport({
  file: 'https://example.com',
  viewportHeight: 800,
  type: 'png',
})
```

### 连接远程浏览器

```ts
const core = await snapka.connect({
  baseUrl: 'http://localhost:9222',
  headers: { 'Authorization': 'Bearer token' },
})
```

## 构建

```bash
cd packages/puppeteer
pnpm build          # tsc && tsdown
```

## 测试

```bash
cd packages/puppeteer
pnpm test           # vitest run
pnpm test:coverage  # vitest run --coverage
```

### 测试覆盖

| 测试文件 | 覆盖内容 |
|----------|----------|
| `core.test.ts` | PuppeteerCore 全部方法：页面管理、截图、重试、空闲回收 |
| `index.test.ts` | `snapka.launch()` 和 `snapka.connect()` 入口 |
| `launch.test.ts` | 路径解析、浏览器查找、下载、镜像探针 |
| `util.test.ts` | 工具函数：类型判断、数组转换、整数转换 |
