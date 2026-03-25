/**
 * 在 WSL/Linux 中测试浏览器安装和依赖检测
 */
import { install, Browser, detectBrowserPlatform, resolveBuildId, computeExecutablePath } from '../src/main.js'
import { execSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const cacheDir = path.join(os.tmpdir(), 'snapka-test-browsers')

async function main () {
  console.log('=== 浏览器安装依赖测试 ===')
  console.log(`平台: ${process.platform} ${os.arch()}`)
  console.log(`发行版: ${getLinuxDistro()}`)
  console.log(`缓存目录: ${cacheDir}`)
  console.log()

  const platform = detectBrowserPlatform()
  if (!platform) {
    console.error('无法检测平台')
    process.exit(1)
  }

  // 获取最新稳定版 Chrome buildId
  const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
  console.log(`Chrome buildId: ${buildId}`)

  // 1. 安装浏览器 (不安装系统依赖)
  console.log('\n--- 步骤 1: 下载浏览器 ---')
  const installed = await install({
    cacheDir,
    browser: Browser.CHROME,
    buildId,
    downloadProgressCallback: 'default',
    installDeps: false,
  })

  const execPath = installed.executablePath
  console.log(`可执行文件: ${execPath}`)
  console.log(`文件存在: ${fs.existsSync(execPath)}`)

  // 2. 检查 deb.deps 内容
  const depsPath = path.join(path.dirname(execPath), 'deb.deps')
  if (fs.existsSync(depsPath)) {
    const depsContent = fs.readFileSync(depsPath, 'utf-8')
    console.log(`\n--- deb.deps 内容 ---`)
    console.log(depsContent.substring(0, 500))
    console.log(`...共 ${depsContent.split('\n').filter(Boolean).length} 行`)
  } else {
    console.log('\n⚠ 未找到 deb.deps 文件')
  }

  // 3. 使用 ldd 检测缺失依赖
  console.log('\n--- 步骤 2: ldd 依赖检测 ---')
  const missingLibs = checkMissingDeps(execPath)
  if (missingLibs.length === 0) {
    console.log('✅ 所有动态库依赖已满足')
  } else {
    console.log(`❌ 缺失 ${missingLibs.length} 个动态库:`)
    for (const lib of missingLibs) {
      console.log(`  - ${lib}`)
    }
  }

  // 4. 尝试直接启动浏览器
  console.log('\n--- 步骤 3: 尝试启动浏览器 ---')
  try {
    const result = spawnSync(execPath, ['--version'], {
      timeout: 10000,
      env: { ...process.env, DISPLAY: '' },
    })
    if (result.status === 0) {
      console.log(`✅ 浏览器版本: ${result.stdout.toString().trim()}`)
    } else {
      console.log(`❌ 启动失败 (exit: ${result.status})`)
      if (result.stderr) {
        console.log(`stderr: ${result.stderr.toString().substring(0, 500)}`)
      }
    }
  } catch (e: any) {
    console.log(`❌ 启动异常: ${e.message}`)
  }

  // 5. 如果有缺失依赖，映射到 apt 包名
  if (missingLibs.length > 0) {
    console.log('\n--- 步骤 4: 映射缺失库到 apt 包 ---')
    const packageMap = await getLib2PackageMap()
    const missingPackages = new Set<string>()
    const unmapped: string[] = []

    for (const lib of missingLibs) {
      const pkg = packageMap[lib]
      if (pkg) {
        missingPackages.add(pkg)
      } else {
        unmapped.push(lib)
      }
    }

    if (missingPackages.size > 0) {
      console.log(`需要安装的 apt 包 (${missingPackages.size} 个):`)
      console.log(`  apt-get install -y ${[...missingPackages].join(' ')}`)
    }
    if (unmapped.length > 0) {
      console.log(`\n无法映射的库 (${unmapped.length} 个):`)
      for (const lib of unmapped) {
        console.log(`  - ${lib}`)
      }
    }
  }
}

function getLinuxDistro (): string {
  try {
    const content = fs.readFileSync('/etc/os-release', 'utf-8')
    const lines = content.split('\n')
    const id = lines.find(l => l.startsWith('ID='))?.split('=')[1]?.replace(/"/g, '') || 'unknown'
    const version = lines.find(l => l.startsWith('VERSION_ID='))?.split('=')[1]?.replace(/"/g, '') || ''
    return `${id} ${version}`
  } catch {
    return 'unknown'
  }
}

function checkMissingDeps (execPath: string): string[] {
  const missing: string[] = []
  const dir = path.dirname(execPath)

  // 收集需要检查的文件
  const filesToCheck = [execPath]
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      if (f.endsWith('.so') || f.includes('.so.')) {
        filesToCheck.push(path.join(dir, f))
      }
    }
  } catch { /** ignore */ }

  for (const file of filesToCheck.slice(0, 5)) { // 限制检查数量避免太慢
    try {
      const result = spawnSync('ldd', [file], {
        timeout: 10000,
        env: { ...process.env, LD_LIBRARY_PATH: dir },
      })
      if (result.stdout) {
        const lines = result.stdout.toString().split('\n')
        for (const line of lines) {
          if (line.includes('=>') && line.includes('not found')) {
            const lib = line.split('=>')[0].trim()
            if (lib && !missing.includes(lib)) {
              missing.push(lib)
            }
          }
        }
      }
    } catch { /** ignore */ }
  }

  return missing
}

async function getLib2PackageMap (): Promise<Record<string, string>> {
  // 从 Playwright 的 nativeDeps 中获取映射
  try {
    const nativeDeps = await import('playwright-core/lib/server/registry/nativeDeps.js')
    const distro = getLinuxDistro().replace(' ', '')
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const key = `${distro}-${arch}`
    const depsForPlatform = nativeDeps.deps[key]
    if (depsForPlatform?.lib2package) {
      return depsForPlatform.lib2package
    }
  } catch { /** ignore */ }

  // 回退到常见映射
  return {
    'libasound.so.2': 'libasound2t64',
    'libatk-bridge-2.0.so.0': 'libatk-bridge2.0-0t64',
    'libatk-1.0.so.0': 'libatk1.0-0t64',
    'libatspi.so.0': 'libatspi2.0-0t64',
    'libcairo.so.2': 'libcairo2',
    'libcups.so.2': 'libcups2t64',
    'libdbus-1.so.3': 'libdbus-1-3',
    'libdrm.so.2': 'libdrm2',
    'libgbm.so.1': 'libgbm1',
    'libglib-2.0.so.0': 'libglib2.0-0t64',
    'libnspr4.so': 'libnspr4',
    'libnss3.so': 'libnss3',
    'libnssutil3.so': 'libnss3',
    'libpango-1.0.so.0': 'libpango-1.0-0',
    'libX11.so.6': 'libx11-6',
    'libxcb.so.1': 'libxcb1',
    'libXcomposite.so.1': 'libxcomposite1',
    'libXdamage.so.1': 'libxdamage1',
    'libXext.so.6': 'libxext6',
    'libXfixes.so.3': 'libxfixes3',
    'libxkbcommon.so.0': 'libxkbcommon0',
    'libXrandr.so.2': 'libxrandr2',
  }
}

main().catch(console.error)
