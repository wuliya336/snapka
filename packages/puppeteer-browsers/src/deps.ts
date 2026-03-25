/**
 * Linux 系统依赖管理
 * 检测和安装浏览器运行所需的系统库
 *
 * 结合了 Puppeteer 的 deb.deps 方式和 Playwright 的 ldd 检测方式
 */

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import debug from 'debug'

const debugDeps = debug('puppeteer:browsers:deps')

/**
 * 依赖检测结果
 * @public
 */
export interface DepsCheckResult {
  /** 是否所有依赖都已满足 */
  ok: boolean
  /** 缺失的共享库列表 (.so 文件名) */
  missingLibraries: string[]
  /** 缺失库映射到的 apt 包名列表 */
  missingPackages: string[]
  /** 无法映射到 apt 包名的库 */
  unmappedLibraries: string[]
  /** 建议的安装命令 */
  installCommand: string | null
}

/**
 * 检测浏览器可执行文件的缺失系统依赖
 *
 * @param executablePath - 浏览器可执行文件路径
 * @returns 依赖检测结果
 * @public
 */
export function checkDependencies (executablePath: string): DepsCheckResult {
  if (process.platform !== 'linux') {
    return { ok: true, missingLibraries: [], missingPackages: [], unmappedLibraries: [], installCommand: null }
  }

  const missingLibraries = detectMissingLibraries(executablePath)
  if (missingLibraries.length === 0) {
    return { ok: true, missingLibraries: [], missingPackages: [], unmappedLibraries: [], installCommand: null }
  }

  const lib2package = getLib2PackageMap()
  const missingPackagesSet = new Set<string>()
  const unmappedLibraries: string[] = []

  for (const lib of missingLibraries) {
    const pkg = lib2package[lib]
    if (pkg) {
      missingPackagesSet.add(pkg)
    } else {
      unmappedLibraries.push(lib)
    }
  }

  // 同时检查 deb.deps 文件补充包列表
  const depsPath = path.join(path.dirname(executablePath), 'deb.deps')
  if (existsSync(depsPath)) {
    const debPackages = parseDebDeps(depsPath)
    const missingDebPackages = findMissingDebPackages(debPackages)
    for (const pkg of missingDebPackages) {
      missingPackagesSet.add(pkg)
    }
  }

  const missingPackages = [...missingPackagesSet]
  const installCommand = missingPackages.length > 0
    ? `apt-get install -y --no-install-recommends ${missingPackages.join(' ')}`
    : null

  return {
    ok: false,
    missingLibraries,
    missingPackages,
    unmappedLibraries,
    installCommand,
  }
}

/**
 * 自动安装浏览器缺失的系统依赖
 *
 * 优先使用 deb.deps 方式 (apt-get satisfy)，回退到 ldd 检测方式
 *
 * @param executablePath - 浏览器可执行文件路径
 * @returns 是否安装成功
 * @public
 */
export function installDependencies (executablePath: string): boolean {
  if (process.platform !== 'linux') return true

  // 先检查是否有缺失依赖
  const check = checkDependencies(executablePath)
  if (check.ok) {
    debugDeps('所有系统依赖已满足')
    return true
  }

  debugDeps(`检测到 ${check.missingLibraries.length} 个缺失库，${check.missingPackages.length} 个需安装的包`)

  // 尝试安装
  if (check.missingPackages.length === 0) {
    debugDeps(`检测到缺失库但无法映射到 apt 包: ${check.unmappedLibraries.join(', ')}`)
    return false
  }

  // 先尝试 deb.deps 的 apt-get satisfy 方式 (精确版本匹配)
  const depsPath = path.join(path.dirname(executablePath), 'deb.deps')
  if (existsSync(depsPath)) {
    const satisfyResult = tryAptSatisfy(depsPath)
    if (satisfyResult) return true
  }

  // 回退到 apt-get install 方式
  return tryAptInstall(check.missingPackages)
}

/**
 * 使用 ldd 检测可执行文件及其目录中 .so 文件的缺失依赖
 */
function detectMissingLibraries (executablePath: string): string[] {
  const missing = new Set<string>()
  const dir = path.dirname(executablePath)

  /** 收集需要检查的文件 */
  const filesToCheck = [executablePath]
  try {
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.so') || name.includes('.so.')) {
        filesToCheck.push(path.join(dir, name))
      }
    }
  } catch { /** ignore */ }

  for (const file of filesToCheck) {
    const result = spawnSync('ldd', [file], {
      timeout: 15000,
      env: { ...process.env, LD_LIBRARY_PATH: dir },
    })

    if (!result.stdout) continue

    for (const line of result.stdout.toString().split('\n')) {
      if (line.includes('=>') && line.includes('not found')) {
        const lib = line.split('=>')[0].trim()
        if (lib) missing.add(lib)
      }
    }
  }

  return [...missing]
}

/**
 * 解析 deb.deps 文件中的包名
 */
function parseDebDeps (depsPath: string): string[] {
  return readFileSync(depsPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

/**
 * 从 deb.deps 条目中检查哪些包未安装
 */
function findMissingDebPackages (debEntries: string[]): string[] {
  const missing: string[] = []
  for (const entry of debEntries) {
    // 提取包名 (去掉版本约束)
    const pkgName = entry.split(/\s*[|(>=<]/)[0].trim()
    if (!pkgName) continue

    const result = spawnSync('dpkg', ['-s', pkgName], { timeout: 5000 })
    if (result.status !== 0) {
      missing.push(pkgName)
    }
  }
  return missing
}

/**
 * 使用 apt-get satisfy 安装 (Puppeteer 方式)
 */
function tryAptSatisfy (depsPath: string): boolean {
  const data = readFileSync(depsPath, 'utf-8').split('\n').filter(Boolean).join(',')

  // 检查 apt-get satisfy 是否可用
  const versionResult = spawnSync('apt-get', ['-v'], { timeout: 5000 })
  if (versionResult.status !== 0) return false

  const cmd = buildRootCommand(`apt-get satisfy -y --no-install-recommends "${data}"`)
  if (!cmd) return false

  debugDeps(`执行: ${cmd}`)
  try {
    execSync(cmd, { stdio: 'inherit', timeout: 300000 })
    return true
  } catch (e) {
    debugDeps(`apt-get satisfy 失败: ${e}`)
    return false
  }
}

/**
 * 使用 apt-get install 安装 (Playwright 方式)
 */
function tryAptInstall (packages: string[]): boolean {
  const updateCmd = buildRootCommand('apt-get update -qq')
  const installCmd = buildRootCommand(`apt-get install -y --no-install-recommends ${packages.join(' ')}`)

  if (!installCmd) {
    debugDeps(
      `需要 root 权限安装系统依赖。请手动执行: ` +
      `sudo apt-get update && sudo apt-get install -y --no-install-recommends ${packages.join(' ')}`
    )
    return false
  }

  try {
    if (updateCmd) {
      debugDeps(`执行: ${updateCmd}`)
      execSync(updateCmd, { stdio: 'inherit', timeout: 120000 })
    }
    debugDeps(`执行: ${installCmd}`)
    execSync(installCmd, { stdio: 'inherit', timeout: 300000 })
    return true
  } catch (e) {
    debugDeps(`apt-get install 失败: ${e}`)
    debugDeps(
      `自动安装系统依赖失败。请手动执行: ` +
      `sudo apt-get update && sudo apt-get install -y --no-install-recommends ${packages.join(' ')}`
    )
    return false
  }
}

/**
 * 构建提权命令
 * root 用户直接执行，否则尝试 sudo
 */
function buildRootCommand (command: string): string | null {
  if (process.getuid?.() === 0) {
    return command
  }

  // 检查 sudo 是否可用
  const sudoResult = spawnSync('sudo', ['-n', 'true'], { timeout: 5000 })
  if (sudoResult.status === 0) {
    return `sudo ${command}`
  }

  // sudo 需要密码，无法自动执行
  return null
}

/**
 * 获取 Linux 发行版信息
 */
export function getLinuxDistro (): { id: string, version: string } {
  try {
    const content = readFileSync('/etc/os-release', 'utf-8')
    const id = content.match(/^ID=(.+)$/m)?.[1]?.replace(/"/g, '') || 'unknown'
    const version = content.match(/^VERSION_ID=(.+)$/m)?.[1]?.replace(/"/g, '') || ''
    return { id, version }
  } catch {
    return { id: 'unknown', version: '' }
  }
}

/**
 * .so 文件名到 apt 包名的映射表
 * 综合 Playwright nativeDeps 和 Chromium 实际依赖整理
 * 覆盖 Ubuntu 20.04/22.04/24.04 和 Debian 11/12/13
 */
function getLib2PackageMap (): Record<string, string> {
  const distro = getLinuxDistro()
  const isNew = distro.id === 'ubuntu' && parseFloat(distro.version) >= 24
    || distro.id === 'debian' && parseInt(distro.version) >= 13

  // Ubuntu 24.04+ / Debian 13+ 使用 t64 后缀
  const t64 = isNew ? 't64' : ''

  return {
    // Chromium 核心依赖
    [`libasound.so.2`]: `libasound2${t64}`,
    [`libatk-1.0.so.0`]: `libatk1.0-0${t64}`,
    [`libatk-bridge-2.0.so.0`]: `libatk-bridge2.0-0${t64}`,
    [`libatspi.so.0`]: `libatspi2.0-0${t64}`,
    [`libcairo.so.2`]: 'libcairo2',
    [`libcups.so.2`]: `libcups2${t64}`,
    [`libdbus-1.so.3`]: 'libdbus-1-3',
    [`libdrm.so.2`]: 'libdrm2',
    [`libgbm.so.1`]: 'libgbm1',
    [`libglib-2.0.so.0`]: `libglib2.0-0${t64}`,
    [`libgio-2.0.so.0`]: `libglib2.0-0${t64}`,
    [`libgobject-2.0.so.0`]: `libglib2.0-0${t64}`,
    [`libgmodule-2.0.so.0`]: `libglib2.0-0${t64}`,
    [`libnspr4.so`]: 'libnspr4',
    [`libnss3.so`]: 'libnss3',
    [`libnssutil3.so`]: 'libnss3',
    [`libsmime3.so`]: 'libnss3',
    [`libpango-1.0.so.0`]: 'libpango-1.0-0',
    [`libpangocairo-1.0.so.0`]: 'libpangocairo-1.0-0',
    [`libX11.so.6`]: 'libx11-6',
    [`libX11-xcb.so.1`]: 'libx11-xcb1',
    [`libxcb.so.1`]: 'libxcb1',
    [`libxcb-shm.so.0`]: 'libxcb-shm0',
    [`libXcomposite.so.1`]: 'libxcomposite1',
    [`libXdamage.so.1`]: 'libxdamage1',
    [`libXext.so.6`]: 'libxext6',
    [`libXfixes.so.3`]: 'libxfixes3',
    [`libxkbcommon.so.0`]: 'libxkbcommon0',
    [`libXrandr.so.2`]: 'libxrandr2',
    [`libXrender.so.1`]: 'libxrender1',
    [`libXcursor.so.1`]: 'libxcursor1',
    [`libXi.so.6`]: 'libxi6',

    // GTK
    [`libgtk-3.so.0`]: `libgtk-3-0${t64}`,
    [`libgdk-3.so.0`]: `libgtk-3-0${t64}`,
    [`libgtk-4.so.1`]: 'libgtk-4-1',
    [`libgdk_pixbuf-2.0.so.0`]: 'libgdk-pixbuf-2.0-0',

    // 字体和渲染
    [`libfontconfig.so.1`]: 'libfontconfig1',
    [`libfreetype.so.6`]: 'libfreetype6',
    [`libharfbuzz.so.0`]: 'libharfbuzz0b',
    [`libharfbuzz-icu.so.0`]: 'libharfbuzz-icu0',
    [`libpng16.so.16`]: isNew ? 'libpng16-16t64' : 'libpng16-16',

    // 多媒体
    [`libvpx.so.9`]: 'libvpx9',
    [`libvpx.so.7`]: 'libvpx7',
    [`libopus.so.0`]: 'libopus0',
    [`libwebp.so.7`]: 'libwebp7',
    [`libwebpdemux.so.2`]: 'libwebpdemux2',
    [`libjpeg.so.8`]: 'libjpeg-turbo8',
    [`libavif.so.16`]: 'libavif16',

    // Wayland
    [`libwayland-client.so.0`]: 'libwayland-client0',
    [`libwayland-egl.so.1`]: 'libwayland-egl1',
    [`libwayland-server.so.0`]: 'libwayland-server0',

    // GStreamer (WebKit)
    [`libgstreamer-1.0.so.0`]: 'libgstreamer1.0-0',
    [`libgstbase-1.0.so.0`]: 'libgstreamer1.0-0',
    [`libgstapp-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstaudio-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstvideo-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstfft-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstpbutils-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgsttag-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstgl-1.0.so.0`]: 'libgstreamer-gl1.0-0',
    [`libgstallocators-1.0.so.0`]: 'libgstreamer-plugins-base1.0-0',
    [`libgstcodecparsers-1.0.so.0`]: 'libgstreamer-plugins-bad1.0-0',

    // 其他
    [`libEGL.so.1`]: 'libegl1',
    [`libGLESv2.so.2`]: 'libgles2',
    [`libepoxy.so.0`]: 'libepoxy0',
    [`liblcms2.so.2`]: 'liblcms2-2',
    [`libxml2.so.2`]: 'libxml2',
    [`libxslt.so.1`]: 'libxslt1.1',
    [`libenchant-2.so.2`]: 'libenchant-2-2',
    [`libsecret-1.so.0`]: 'libsecret-1-0',
    [`libsoup-3.0.so.0`]: 'libsoup-3.0-0',
    [`libhyphen.so.0`]: 'libhyphen0',
    [`libatomic.so.1`]: 'libatomic1',
    [`libwoff2dec.so.1.0.2`]: 'libwoff1',
    [`libmanette-0.2.so.0`]: 'libmanette-0.2-0',
    [`libevent-2.1.so.7`]: isNew ? 'libevent-2.1-7t64' : 'libevent-2.1-7',
    [`libdbus-glib-1.so.2`]: `libdbus-glib-1-2${t64}`,
    [`libicudata.so.74`]: 'libicu74',
    [`libicui18n.so.74`]: 'libicu74',
    [`libicuuc.so.74`]: 'libicu74',
    [`libicudata.so.72`]: 'libicu72',
    [`libicui18n.so.72`]: 'libicu72',
    [`libicuuc.so.72`]: 'libicu72',
    [`libicudata.so.70`]: 'libicu70',
    [`libicui18n.so.70`]: 'libicu70',
    [`libicuuc.so.70`]: 'libicu70',

    // Flite (TTS)
    [`libflite.so.1`]: 'libflite1',
    [`libflite_cmulex.so.1`]: 'libflite1',
    [`libflite_usenglish.so.1`]: 'libflite1',
    [`libflite_cmu_us_slt.so.1`]: 'libflite1',
    [`libflite_cmu_us_kal.so.1`]: 'libflite1',
    [`libflite_cmu_us_kal16.so.1`]: 'libflite1',
    [`libflite_cmu_us_awb.so.1`]: 'libflite1',
    [`libflite_cmu_us_rms.so.1`]: 'libflite1',
    [`libflite_cmu_time_awb.so.1`]: 'libflite1',
    [`libflite_cmu_grapheme_lang.so.1`]: 'libflite1',
    [`libflite_cmu_grapheme_lex.so.1`]: 'libflite1',
    [`libflite_cmu_indic_lang.so.1`]: 'libflite1',
    [`libflite_cmu_indic_lex.so.1`]: 'libflite1',
  }
}
