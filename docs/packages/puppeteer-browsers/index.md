# @snapka/puppeteer-browsers

浏览器下载管理器 — 支持下载、安装、缓存管理和版本解析。

## 源码分析

### 模块结构

| 文件 | 作用 |
|------|------|
| `install.ts` | `install()` / `uninstall()` / `canDownload()` / `getDownloadUrl()` |
| `Cache.ts` | `Cache` / `InstalledBrowser` — 缓存目录管理 |
| `httpUtil.ts` | `downloadFile()` / `probeUrls()` / `getJSON()` / `getText()` |
| `detectPlatform.ts` | `detectBrowserPlatform()` — OS/arch 检测 |
| `fileUtil.ts` | `unpackArchive()` — zip/tar/dmg/exe 解压 |
| `launch.ts` | `computeExecutablePath()` / `launch()` / `Process` |
| `CLI.ts` | CLI 命令：install / launch / clear / list |
| `browser-data/` | 各浏览器的下载 URL、路径、版本解析 |

### 浏览器数据

支持的浏览器：

| 浏览器 | 默认源 |
|--------|--------|
| Chrome | `registry.npmmirror.com/-/binary/chrome-for-testing-public` |
| Chromium | `registry.npmmirror.com/-/binary/chromium-browser-snapshots` |
| Chrome Headless Shell | `registry.npmmirror.com/-/binary/chrome-for-testing-public` |
| ChromeDriver | `registry.npmmirror.com/-/binary/chrome-for-testing-public` |
| Firefox | `archive.mozilla.org` |

### 缓存结构

```
~/.cache/puppeteer/
├── chrome/
│   ├── .metadata
│   └── win64-120.0.6099.109/
│       └── chrome-win64/chrome.exe
├── chromium/
│   └── win64-1234567/
└── chrome-headless-shell/
```

### 镜像探针 (probeUrls)

使用交错延迟策略，优先使用阿里云镜像：

```ts
// 阿里云立即发起，Google 延迟 300ms
const baseUrl = await probeUrls([
  'https://registry.npmmirror.com/...',  // 立即
  'https://storage.googleapis.com/...',   // 延迟 300ms
])
```

## 使用说明

### 安装

```bash
pnpm add @snapka/puppeteer-browsers
```

### 下载浏览器

```ts
import { install, detectBrowserPlatform } from '@snapka/browsers'

const browser = await install({
  browser: 'chrome',
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: '/path/to/cache',
  downloadProgressCallback: 'default',
})

console.log(browser.executablePath)
```

### 版本解析

```ts
import { resolveBuildId } from '@snapka/browsers'

// 按渠道解析
const buildId = await resolveBuildId('chrome', platform, 'stable')

// 按里程碑解析
const buildId = await resolveBuildId('chrome', platform, '120')
```

### CLI

```bash
npx @snapka/puppeteer-browsers install chrome@stable
npx @snapka/puppeteer-browsers list --cache-dir ~/.cache
npx @snapka/puppeteer-browsers clear --cache-dir ~/.cache
```

## 构建

```bash
cd packages/puppeteer-browsers
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
| `httpUtil.test.ts` | HTTP 工具：HEAD 请求、下载、JSON、探针 |
| `detectPlatform.test.ts` | 平台检测 |
| `cache.test.ts` | 缓存管理：目录结构、metadata、安装/卸载 |
| `browser-data.test.ts` | 各浏览器下载 URL 和路径生成 |
| `install.test.ts` | `getDownloadUrl` 和默认镜像源 |
| `types.test.ts` | 枚举类型：Browser、BrowserPlatform、BrowserTag |
