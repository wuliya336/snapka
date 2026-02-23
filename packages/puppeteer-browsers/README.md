# @snapka/browsers

基于 Puppeteer 的浏览器下载与启动工具，提供 CLI 与 Node.js API，支持自动下载、安装和管理多种浏览器。

## ✨ 特性

- 🚀 支持多种浏览器：Chrome、Chromium、Firefox、ChromeDriver、Chrome Headless Shell
- 📦 自动下载和管理浏览器版本
- 🔄 支持多个发布渠道：stable、beta、dev、canary 等
- 🌐 支持代理和自定义镜像源
- 💻 提供 CLI 和 Node.js API 两种使用方式
- 🇨🇳 命令行输出完全本地化为中文

## 📊 与上游差异

相比官方 `@puppeteer/browsers`：

- ✅ 移除 `proxy-agent`，使用 Axios 原生代理（支持 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）
- ✅ 解压工具改为 `decompress`，移除 `tar-fs` 和 `extract-zip` 依赖
- ✅ 包体积大幅缩减：约 **12 MB → 800 KB+**（数据来源：[pkg-size.dev](https://pkg-size.dev/@puppeteer/browsers)）
- ✅ 新增 `probeUrls()` 工具函数，支持自动选择最快的镜像源
- ✅ Chromium 版本解析失败时提供兜底版本号，避免下载中断

## 📋 环境要求

- **Node.js**: 18.0 或更高版本
- **平台**: Linux / macOS / Windows（自动检测，可手动指定）

## 📦 安装

```bash
npm install @snapka/browsers
# 或
pnpm add @snapka/browsers
# 或
yarn add @snapka/browsers
```

## 🚀 快速开始

### CLI 使用

```bash
# 安装最新版 Chrome
npx @snapka/browsers install chrome

# 安装特定通道的 Chrome
npx @snapka/browsers install chrome@beta

# 安装特定版本的 Chrome
npx @snapka/browsers install chrome@120.0.6099.109

# 安装到指定目录
npx @snapka/browsers install chrome --path ./my-browsers

# 列出已安装的浏览器
npx @snapka/browsers list

# 启动已安装的浏览器
npx @snapka/browsers launch chrome@120.0.6099.109
```

### Node.js API 使用

```typescript
import {
  Browser,
  install,
  launch,
  resolveBuildId,
  detectBrowserPlatform,
  computeExecutablePath,
} from '@snapka/browsers'

// 1. 检测当前平台
const platform = detectBrowserPlatform()

// 2. 解析版本标识
const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')

// 3. 下载并安装浏览器
await install({
  browser: Browser.CHROME,
  buildId,
  platform,
  cacheDir: './.browsers',
  downloadProgressCallback: 'default', // 显示下载进度
})

// 4. 获取可执行文件路径
const executablePath = computeExecutablePath({
  browser: Browser.CHROME,
  buildId,
  platform,
  cacheDir: './.browsers',
})

// 5. 启动浏览器
const process = await launch({
  executablePath,
  args: ['--headless=new', '--no-sandbox'],
})

// 6. 使用完毕后关闭
await process.kill()
```

## 🌐 支持的浏览器

### Chrome

- **标识符**: `chrome`
- **支持的通道/标签**:
  - `@latest` - 最新的 Canary 版本
  - `@stable` - 稳定版
  - `@beta` - 测试版
  - `@dev` - 开发版
  - `@canary` - Canary 版
  - `@<版本号>` - 特定版本，如 `@120` 或 `@120.0.6099.109`
- **示例**:

  ```bash
  npx @snapka/browsers install chrome@stable
  npx @snapka/browsers install chrome@120.0.6099.109
  ```

### Chromium

- **标识符**: `chromium`
- **支持的标签**:
  - `@latest` - 最新的快照版本
  - `@<修订号>` - 特定修订版，如 `@1083080`
- **示例**:

  ```bash
  npx @snapka/browsers install chromium@latest
  npx @snapka/browsers install chromium@1083080
  ```

### Firefox

- **标识符**: `firefox`
- **支持的通道/标签**:
  - `@latest` / `@nightly` - Nightly 版本
  - `@stable` - 稳定版
  - `@beta` - 测试版
  - `@devedition` - 开发者版
  - `@esr` - ESR 长期支持版
  - `@<版本号>` - 特定版本，如 `@stable_111.0.1`
- **示例**:

  ```bash
  npx @snapka/browsers install firefox@stable
  npx @snapka/browsers install firefox@nightly
  ```

### ChromeDriver

- **标识符**: `chromedriver`
- **支持的通道/标签**:
  - `@latest` / `@canary` - 最新 Canary 版本
  - `@stable` - 稳定版
  - `@beta` - 测试版
  - `@dev` - 开发版
  - `@<版本号>` - 特定版本，如 `@115` 或 `@115.0.5790`
- **示例**:

  ```bash
  npx @snapka/browsers install chromedriver@stable
  npx @snapka/browsers install chromedriver@115.0.5790
  ```

### Chrome Headless Shell

- **标识符**: `chrome-headless-shell`
- **支持的通道/标签**:
  - `@latest` / `@canary` - 最新 Canary 版本
  - `@stable` - 稳定版
  - `@beta` - 测试版
  - `@dev` - 开发版
  - `@<版本号>` - 特定版本
- **示例**:

  ```bash
  npx @snapka/browsers install chrome-headless-shell@stable
  npx @snapka/browsers install chrome-headless-shell@118
  ```

## 🔧 CLI 命令参考

### install

下载并安装指定的浏览器。

```bash
npx @snapka/browsers install <browser>[@<buildId|channel>] [options]
```

**选项**:

- `--platform <platform>` - 指定平台（`linux`, `mac`, `mac-arm`, `win32`, `win64`）
- `--path <path>` - 指定缓存目录（默认：当前工作目录）
- `--base-url <url>` - 自定义下载源 URL
- `--install-deps` - 安装系统依赖（仅 Linux，需要 root 权限）

**示例**:

```bash
# 基本用法
npx @snapka/browsers install chrome

# 指定版本通道
npx @snapka/browsers install chrome@beta

# 指定具体版本
npx @snapka/browsers install chrome@120.0.6099.109

# 指定平台和缓存目录
npx @snapka/browsers install firefox@stable --platform mac --path ./browsers

# 使用镜像源
npx @snapka/browsers install chrome --base-url https://example.com/mirrors
```

镜像源参考:

- chrome: `https://registry.npmmirror.com/-/binary/chrome-for-testing`
- chromium: `https://registry.npmmirror.com/-/binary/chromium-browser-snapshots`

### launch

启动已安装的浏览器。

```bash
npx @snapka/browsers launch <browser>[@<buildId>] [options] [-- <browser-args>]
```

**选项**:

- `--platform <platform>` - 指定平台
- `--path <path>` - 指定缓存目录
- `--detached` - 以分离模式运行（不阻塞终端）
- `--system` - 使用系统已安装的浏览器
- `--dumpio` - 转发浏览器进程的 stdout 和 stderr

**示例**:

```bash
# 启动已安装的浏览器
npx @snapka/browsers launch chrome@120.0.6099.109

# 启动并传递浏览器参数
npx @snapka/browsers launch chrome@stable -- --headless=new --disable-gpu

# 启动系统安装的 Chrome Canary
npx @snapka/browsers launch chrome@canary --system

# 以分离模式启动
npx @snapka/browsers launch firefox@stable --detached
```

### list

列出所有已安装的浏览器。

```bash
npx @snapka/browsers list [options]
```

**选项**:

- `--path <path>` - 指定缓存目录

**示例**:

```bash
npx @snapka/browsers list
npx @snapka/browsers list --path ./my-browsers
```

### clear

清空缓存目录中的所有浏览器。

```bash
npx @snapka/browsers clear [options]
```

**选项**:

- `--path <path>` - 指定缓存目录

**示例**:

```bash
npx @snapka/browsers clear
npx @snapka/browsers clear --path ./my-browsers
```

## 📚 Node.js API 参考

### 枚举类型

#### Browser

浏览器类型枚举。

```typescript
enum Browser {
  CHROME = 'chrome',
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  CHROMEDRIVER = 'chromedriver',
  CHROMEHEADLESSSHELL = 'chrome-headless-shell',
}
```

#### BrowserPlatform

支持的平台。

```typescript
enum BrowserPlatform {
  LINUX = 'linux',
  MAC = 'mac',
  MAC_ARM = 'mac-arm',
  WIN32 = 'win32',
  WIN64 = 'win64',
}
```

#### ChromeReleaseChannel

Chrome 发布通道。

```typescript
enum ChromeReleaseChannel {
  STABLE = 'stable',
  BETA = 'beta',
  DEV = 'dev',
  CANARY = 'canary',
}
```

### 核心函数

#### detectBrowserPlatform()

自动检测当前操作系统平台。

```typescript
function detectBrowserPlatform(): BrowserPlatform
```

**返回**: 当前平台的 `BrowserPlatform` 枚举值

**示例**:

```typescript
import { detectBrowserPlatform } from '@snapka/browsers'

const platform = detectBrowserPlatform()
console.log(platform) // 例如: 'win64'
```

#### resolveBuildId()

将版本标签或通道名解析为实际的构建 ID。

```typescript
function resolveBuildId(
  browser: Browser,
  platform: BrowserPlatform,
  tag: string
): Promise<string>
```

**参数**:

- `browser` - 浏览器类型
- `platform` - 目标平台
- `tag` - 版本标签（如 `'latest'`, `'stable'`, `'120.0.6099.109'`）

**返回**: 解析后的构建 ID

**示例**:

```typescript
import { Browser, resolveBuildId, detectBrowserPlatform } from '@snapka/browsers'

const buildId = await resolveBuildId(
  Browser.CHROME,
  detectBrowserPlatform(),
  'stable'
)
console.log(buildId) // 例如: '120.0.6099.109'
```

#### install()

下载并安装浏览器。

```typescript
function install(options: InstallOptions): Promise<void>

interface InstallOptions {
  browser: Browser
  buildId: string
  platform: BrowserPlatform
  cacheDir: string
  baseUrl?: string
  downloadProgressCallback?: 'default' | ((downloadedBytes: number, totalBytes: number) => void)
  installDeps?: boolean
}
```

**参数**:

- `browser` - 浏览器类型
- `buildId` - 构建 ID（通过 `resolveBuildId()` 获取）
- `platform` - 目标平台
- `cacheDir` - 缓存目录路径
- `baseUrl` - （可选）自定义下载源 URL
- `downloadProgressCallback` - （可选）下载进度回调，传 `'default'` 显示默认进度条
- `installDeps` - （可选）是否安装系统依赖（仅 Linux）

**示例**:

```typescript
import { Browser, install, resolveBuildId, detectBrowserPlatform } from '@snapka/browsers'

const platform = detectBrowserPlatform()
const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')

await install({
  browser: Browser.CHROME,
  buildId,
  platform,
  cacheDir: './browsers',
  downloadProgressCallback: 'default',
})
```

#### computeExecutablePath()

计算已安装浏览器的可执行文件路径。

```typescript
function computeExecutablePath(options: ComputeExecutablePathOptions): string

interface ComputeExecutablePathOptions {
  browser: Browser
  buildId: string
  platform: BrowserPlatform
  cacheDir: string
}
```

**返回**: 浏览器可执行文件的绝对路径

**示例**:

```typescript
import { Browser, computeExecutablePath, detectBrowserPlatform } from '@snapka/browsers'

const executablePath = computeExecutablePath({
  browser: Browser.CHROME,
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: './browsers',
})
console.log(executablePath)
```

#### launch()

启动浏览器进程。

```typescript
function launch(options: LaunchOptions): Promise<Process>

interface LaunchOptions {
  executablePath?: string
  args?: string[]
  dumpio?: boolean
  detached?: boolean
  env?: NodeJS.ProcessEnv
  handleSIGINT?: boolean
  handleSIGTERM?: boolean
  handleSIGHUP?: boolean
}

interface Process {
  pid: number
  kill(signal?: NodeJS.Signals): Promise<void>
  exitPromise: Promise<number | null>
}
```

**参数**:

- `executablePath` - 浏览器可执行文件路径
- `args` - （可选）传递给浏览器的命令行参数
- `dumpio` - （可选）是否转发浏览器的 stdout/stderr
- `detached` - （可选）是否以分离模式运行
- `env` - （可选）环境变量
- `handleSIGINT/SIGTERM/SIGHUP` - （可选）是否处理信号

**返回**: `Process` 对象，包含进程 ID 和控制方法

**示例**:

```typescript
import { launch, computeExecutablePath } from '@snapka/browsers'

const executablePath = computeExecutablePath({
  browser: Browser.CHROME,
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: './browsers',
})

const process = await launch({
  executablePath,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
  dumpio: true,
})

console.log('浏览器进程 PID:', process.pid)

// 等待进程退出
await process.exitPromise

// 或手动终止
await process.kill()
```

#### canDownload()

检查浏览器是否可以下载（不实际下载）。

```typescript
function canDownload(options: InstallOptions): Promise<boolean>
```

**返回**: 如果可以下载返回 `true`

**示例**:

```typescript
import { Browser, canDownload, detectBrowserPlatform } from '@snapka/browsers'

const isAvailable = await canDownload({
  browser: Browser.CHROME,
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: './browsers',
})

console.log('可以下载:', isAvailable)
```

#### getInstalledBrowsers()

获取已安装的浏览器列表。

```typescript
function getInstalledBrowsers(options: GetInstalledBrowsersOptions): InstalledBrowser[]

interface GetInstalledBrowsersOptions {
  cacheDir: string
}

interface InstalledBrowser {
  browser: Browser
  buildId: string
  platform: BrowserPlatform
  cacheDir: string
  executablePath: string
}
```

**示例**:

```typescript
import { getInstalledBrowsers } from '@snapka/browsers'

const browsers = getInstalledBrowsers({ cacheDir: './browsers' })

browsers.forEach(browser => {
  console.log(`${browser.browser}@${browser.buildId} (${browser.platform})`)
  console.log(`  路径: ${browser.executablePath}`)
})
```

#### uninstall()

卸载已安装的浏览器。

```typescript
function uninstall(options: UninstallOptions): Promise<void>

interface UninstallOptions {
  browser: Browser
  platform: BrowserPlatform
  cacheDir: string
  buildId: string
}
```

**示例**:

```typescript
import { Browser, uninstall, detectBrowserPlatform } from '@snapka/browsers'

await uninstall({
  browser: Browser.CHROME,
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: './browsers',
})
```

### Cache 类

管理浏览器缓存目录。

```typescript
class Cache {
  constructor(cacheDir: string)
  
  getInstalledBrowsers(): InstalledBrowser[]
  clear(): void
}
```

**示例**:

```typescript
import { Cache } from '@snapka/browsers'

const cache = new Cache('./browsers')

// 获取已安装的浏览器
const browsers = cache.getInstalledBrowsers()
console.log('已安装:', browsers.length, '个浏览器')

// 清空缓存（删除所有已安装的浏览器）
cache.clear()
```

### 工具函数

#### computeSystemExecutablePath()

获取系统已安装浏览器的路径（仅支持 Chrome）。

```typescript
function computeSystemExecutablePath(options: SystemOptions): string

interface SystemOptions {
  browser: Browser
  channel: ChromeReleaseChannel
  platform: BrowserPlatform
}
```

**示例**:

```typescript
import { Browser, ChromeReleaseChannel, computeSystemExecutablePath, detectBrowserPlatform } from '@snapka/browsers'

const systemChromePath = computeSystemExecutablePath({
  browser: Browser.CHROME,
  channel: ChromeReleaseChannel.STABLE,
  platform: detectBrowserPlatform(),
})
```

#### getVersionComparator()

获取浏览器版本比较函数（用于排序）。

```typescript
function getVersionComparator(browser: Browser): (a: string, b: string) => number
```

**示例**:

```typescript
import { Browser, getVersionComparator } from '@snapka/browsers'

const versions = ['120.0.6099.109', '119.0.6045.105', '121.0.6167.85']
const comparator = getVersionComparator(Browser.CHROME)

const sorted = versions.sort(comparator)
console.log(sorted) // ['119.0.6045.105', '120.0.6099.109', '121.0.6167.85']
```

#### getDownloadUrl()

获取浏览器下载 URL。

```typescript
function getDownloadUrl(
  browser: Browser,
  platform: BrowserPlatform,
  buildId: string,
  baseUrl?: string
): URL
```

**示例**:

```typescript
import { Browser, getDownloadUrl, detectBrowserPlatform } from '@snapka/browsers'

const url = getDownloadUrl(
  Browser.CHROME,
  detectBrowserPlatform(),
  '120.0.6099.109'
)
console.log(url.toString())
```

#### createProfile()

创建浏览器配置文件目录（仅支持 Firefox）。

```typescript
function createProfile(browser: Browser, options: ProfileOptions): Promise<void>

interface ProfileOptions {
  path?: string
}
```

#### probeUrls()

URL 探针，返回第一个可达的 URL。

仅探测域名（origin）的可达性，任何 HTTP 响应都视为可达，只有网络错误（超时、DNS 失败等）才视为失败。

```typescript
function probeUrls(
  urls: (URL | string)[],
  options?: {
    timeout?: number
    staggerDelay?: number
  }
): Promise<string>
```

**参数**:

- `urls` - 要检测的 URL 列表（靠前的优先级更高）
- `options` - （可选）配置选项
  - `timeout` - 超时时间（毫秒），默认 `5000`
  - `staggerDelay` - 每个后续 URL 相对于前一个的延迟（ms），默认 `300`

**返回**: 第一个可达的 URL，如果全部失败则抛出错误

**示例**:

```typescript
import { probeUrls } from '@snapka/browsers'

// 使用默认配置（超时 5 秒）
const fastestUrl = await probeUrls([
  'https://registry.npmmirror.com/-/binary/chromium-browser-snapshots',
  'https://storage.googleapis.com/chromium-browser-snapshots',
  'https://example.com/mirror'
])

// 自定义超时
const fastestUrl = await probeUrls(
  ['url1', 'url2', 'url3'],
  {
    timeout: 10000
  }
)
```

**工作原理**:

- 仅对 URL 的 origin（域名）发起 HEAD 请求，不带路径
- 任何 HTTP 响应（包括 404、403）都视为服务器可达
- 优先使用列表中靠前的 URL，后续 URL 延迟发起
- 使用 `Promise.any`，只要有一个成功就立即返回
- 所有 URL 都失败时抛出错误

## 🌍 代理与镜像配置

### 使用代理

设置环境变量：

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

npx @snapka/browsers install chrome
```

在 Windows PowerShell 中：

```powershell
$env:HTTP_PROXY="http://proxy.example.com:8080"
$env:HTTPS_PROXY="http://proxy.example.com:8080"

npx @snapka/browsers install chrome
```

### 使用镜像源

CLI 方式：

```bash
npx @snapka/browsers install chrome --base-url https://npm.taobao.org/mirrors
```

Node.js API 方式：

```typescript
await install({
  browser: Browser.CHROME,
  buildId,
  platform,
  cacheDir: './browsers',
  baseUrl: 'https://npm.taobao.org/mirrors',
})
```

## 💡 实用示例

### 在 CI/CD 中使用

```yaml
# GitHub Actions 示例
name: E2E Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Cache browsers
        uses: actions/cache@v3
        with:
          path: ./.browsers
          key: browsers-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Chrome
        run: npx @snapka/browsers install chrome@stable --path ./.browsers
      
      - name: Run tests
        run: npm test
```

### 与 Puppeteer 集成

```typescript
import puppeteer from 'puppeteer-core'
import {
  Browser,
  install,
  resolveBuildId,
  detectBrowserPlatform,
  computeExecutablePath,
} from '@snapka/browsers'

async function setupBrowser() {
  const platform = detectBrowserPlatform()
  const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
  
  await install({
    browser: Browser.CHROME,
    buildId,
    platform,
    cacheDir: './.browsers',
    downloadProgressCallback: 'default',
  })
  
  const executablePath = computeExecutablePath({
    browser: Browser.CHROME,
    buildId,
    platform,
    cacheDir: './.browsers',
  })
  
  return await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

const browser = await setupBrowser()
const page = await browser.newPage()
await page.goto('https://example.com')
await browser.close()
```

### 下载多个浏览器

```typescript
import {
  Browser,
  install,
  resolveBuildId,
  detectBrowserPlatform,
} from '@snapka/browsers'

async function installMultipleBrowsers() {
  const platform = detectBrowserPlatform()
  const cacheDir = './browsers'
  
  const browsers = [
    { browser: Browser.CHROME, tag: 'stable' },
    { browser: Browser.FIREFOX, tag: 'stable' },
    { browser: Browser.CHROMEDRIVER, tag: 'stable' },
  ]
  
  for (const { browser, tag } of browsers) {
    console.log(`正在安装 ${browser}@${tag}...`)
    
    const buildId = await resolveBuildId(browser, platform, tag)
    
    await install({
      browser,
      buildId,
      platform,
      cacheDir,
      downloadProgressCallback: 'default',
    })
    
    console.log(`✓ ${browser}@${buildId} 安装完成`)
  }
}

await installMultipleBrowsers()
```

## ❓ 常见问题

### 如何指定具体的 Chrome 版本？

```bash
# 使用完整版本号
npx @snapka/browsers install chrome@120.0.6099.109

# 使用主版本号（会自动解析为该主版本的最新构建）
npx @snapka/browsers install chrome@120
```

### 如何在不同平台上安装浏览器？

```bash
# 为 macOS (Intel) 安装
npx @snapka/browsers install chrome@stable --platform mac

# 为 macOS (Apple Silicon) 安装
npx @snapka/browsers install chrome@stable --platform mac-arm

# 为 Linux 安装
npx @snapka/browsers install chrome@stable --platform linux

# 为 Windows 64位 安装
npx @snapka/browsers install chrome@stable --platform win64
```

### 如何清理旧版本浏览器？

```typescript
import { Cache, uninstall } from '@snapka/browsers'

const cache = new Cache('./browsers')
const installed = cache.getInstalledBrowsers()

// 按版本排序，保留最新的 3 个版本
const chromes = installed
  .filter(b => b.browser === 'chrome')
  .sort((a, b) => b.buildId.localeCompare(a.buildId))

// 删除旧版本
for (const browser of chromes.slice(3)) {
  await uninstall({
    browser: browser.browser,
    buildId: browser.buildId,
    platform: browser.platform,
    cacheDir: browser.cacheDir,
  })
}
```

### 下载失败怎么办？

1. 检查网络连接
2. 尝试使用代理或镜像源
3. 检查磁盘空间是否充足
4. 使用 `canDownload()` 函数检查该版本是否可用

```typescript
const available = await canDownload({
  browser: Browser.CHROME,
  buildId: '120.0.6099.109',
  platform: detectBrowserPlatform(),
  cacheDir: './browsers',
})

if (!available) {
  console.error('该版本不可用')
}
```

## 📄 许可证

Apache-2.0（与 Puppeteer 上游一致）

## 🔗 相关链接

- [Puppeteer 官方文档](https://pptr.dev/)
- [Chrome for Testing 下载站](https://googlechromelabs.github.io/chrome-for-testing/)
- [Firefox 发布说明](https://www.mozilla.org/en-US/firefox/releases/)

---

**提示**: 在 CI 环境中，建议缓存浏览器下载目录以加快构建速度。默认缓存目录为当前工作目录，可通过 `--path` 或 API 的 `cacheDir` 参数自定义。
