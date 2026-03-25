/**
 * 在 WSL 中测试 deps 模块
 * 用法: npx tsx scripts/test-deps.ts <chrome-executable-path>
 */

import { checkDependencies, installDependencies, getLinuxDistro } from '../src/deps'

const execPath = process.argv[2]

if (!execPath) {
  console.log('用法: npx tsx scripts/test-deps.ts <chrome-executable-path>')
  console.log('示例: npx tsx scripts/test-deps.ts /tmp/snapka-test-browsers/chrome/linux-146.0.7680.165/chrome-linux64/chrome')
  process.exit(1)
}

console.log('=== Linux 发行版信息 ===')
const distro = getLinuxDistro()
console.log(`ID: ${distro.id}`)
console.log(`Version: ${distro.version}`)
console.log()

console.log('=== 检测缺失依赖 ===')
console.log(`浏览器路径: ${execPath}`)
const result = checkDependencies(execPath)

if (result.ok) {
  console.log('✓ 所有系统依赖已满足！')
} else {
  console.log(`✗ 发现 ${result.missingLibraries.length} 个缺失库:`)
  for (const lib of result.missingLibraries) {
    console.log(`  - ${lib}`)
  }
  console.log()
  console.log(`映射到 ${result.missingPackages.length} 个 apt 包:`)
  for (const pkg of result.missingPackages) {
    console.log(`  - ${pkg}`)
  }
  if (result.unmappedLibraries.length > 0) {
    console.log()
    console.log(`无法映射的库 (${result.unmappedLibraries.length}):`)
    for (const lib of result.unmappedLibraries) {
      console.log(`  - ${lib}`)
    }
  }
  if (result.installCommand) {
    console.log()
    console.log('建议安装命令:')
    console.log(`  sudo ${result.installCommand}`)
  }

  // 可选：自动安装
  if (process.argv.includes('--install')) {
    console.log()
    console.log('=== 尝试自动安装 ===')
    const success = installDependencies(execPath)
    console.log(success ? '✓ 安装成功！' : '✗ 安装失败')

    if (success) {
      console.log()
      console.log('=== 再次检测 ===')
      const recheck = checkDependencies(execPath)
      console.log(recheck.ok ? '✓ 所有依赖已满足' : `✗ 仍有 ${recheck.missingLibraries.length} 个缺失库`)
    }
  }
}
