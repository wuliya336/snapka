# @snapka/browser-finder

系统浏览器查找器 — 自动发现系统中已安装的浏览器。

## 源码分析

### 模块结构

| 目录/文件 | 作用 |
|-----------|------|
| `browsers/` | 各浏览器的查找逻辑（Chrome、Edge、Brave、Chromium） |
| `playwright/` | Playwright 安装的浏览器查找 |
| `puppeteer/` | Puppeteer 安装的浏览器查找 |
| `utils/` | 平台工具、文件操作 |
| `types/` | BrowserInfo 等类型定义 |

### 查找策略

浏览器查找涵盖多种方式：

1. **注册表查找**（Windows）— 读取注册表获取安装路径
2. **常见路径查找** — 遍历系统中常见的安装位置
3. **Puppeteer 缓存** — 查找 `~/.cache/puppeteer` 下载目录
4. **Playwright 缓存** — 查找 `~/.cache/ms-playwright` 下载目录

### 支持平台

- Windows (x64/arm64)
- macOS (x64/arm64)
- Linux (x64/arm64)

### 支持浏览器

- Google Chrome
- Microsoft Edge
- Brave
- Chromium
- Chrome Headless Shell
- ChromeDriver

## 使用说明

### 安装

```bash
pnpm add @snapka/browser-finder
```

### 基本用法

```ts
import { browserFinder } from '@snapka/browser-finder'

// 查找所有浏览器
const browsers = browserFinder.findSync()

// 查找特定浏览器
const chrome = browserFinder.findChromeSync()
const edge = browserFinder.findEdgeSync()
const brave = browserFinder.findBraveSync()

// 异步版本
const browsers = await browserFinder.find()
const chrome = await browserFinder.findChrome()
```

### 返回类型

```ts
interface BrowserInfo {
  name: string
  executablePath: string
  version?: string
  type: 'chrome' | 'edge' | 'brave' | 'chromium' | ...
}
```

## 构建

```bash
cd packages/browser-finder
pnpm build
```

## 测试

```bash
pnpm test
pnpm test:coverage
```

### 测试覆盖

| 测试文件 | 覆盖内容 |
|----------|----------|
| `browsers.test.ts` | SystemBrowserFinder 集成测试 |
| `brave.test.ts` | Brave 浏览器查找 |
| `edge.test.ts` | Edge 浏览器查找 |
| `file.test.ts` | 文件操作工具 |
| `index.test.ts` | 入口模块导出 |
| `path-utils.test.ts` | 路径工具 |
| `platform.test.ts` | 平台检测 |
| `playwright.test.ts` | Playwright 缓存查找 |
| `puppeteer.test.ts` | Puppeteer 缓存查找 |
