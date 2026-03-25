/**
 * 真实网站截图测试 - github.com
 * 测试全页截图、视口分片截图、元素截图
 * 支持 puppeteer 和 playwright 两种引擎
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const engine = process.argv[2] || 'puppeteer'
if (engine !== 'puppeteer' && engine !== 'playwright') {
  console.error('用法: tsx github-screenshot-test.ts [puppeteer|playwright]')
  process.exit(1)
}

/** 检查 PNG 文件签名 */
function isPNG (data: Uint8Array): boolean {
  return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
}

/** 检查 JPEG 文件签名 */
function isJPEG (data: Uint8Array): boolean {
  return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
}

const outputDir = path.join(__dirname, '..', 'output', engine, 'github')
fs.mkdirSync(outputDir, { recursive: true })

let passed = 0
let failed = 0
const results: { name: string, status: string, detail: string }[] = []

function report (name: string, ok: boolean, detail: string) {
  if (ok) {
    passed++
    results.push({ name, status: '✅ PASS', detail })
    console.log(`  ✅ ${name} - ${detail}`)
  } else {
    failed++
    results.push({ name, status: '❌ FAIL', detail })
    console.error(`  ❌ ${name} - ${detail}`)
  }
}

console.log(`\n🚀 使用 ${engine} 引擎对 github.com 进行真实截图测试\n`)

// 动态导入对应引擎
const { snapka } = engine === 'puppeteer'
  ? await import('@snapka/puppeteer')
  : await import('@snapka/playwright')

console.log('⏳ 启动浏览器...')
const instance = await snapka.launch({
  headless: 'shell',
  defaultViewport: { width: 1280, height: 800 },
})
console.log('✅ 浏览器已启动\n')

// Puppeteer 使用 networkidle2, Playwright 使用 load（github.com 复杂页面不易达到 networkidle）
const waitUntil = (engine === 'puppeteer' ? 'networkidle2' : 'load') as any

// ═══════════════════════════════════════════════════════
// 测试 1: 全页截图 (fullPage)
// ═══════════════════════════════════════════════════════
console.log('━━━ 测试 1: 全页截图 (fullPage) ━━━')
try {
  console.time('  fullPage 耗时')
  const filePath = path.join(outputDir, 'fullpage.png')
  const { run } = await instance.screenshot({
    file: 'https://github.com',
    fullPage: true,
    type: 'png',
    path: filePath,
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const data = await run()
  console.timeEnd('  fullPage 耗时')

  const isValidPNG = isPNG(data)
  const fileExists = fs.existsSync(filePath)
  const fileSize = fileExists ? fs.statSync(filePath).size : 0

  report('fullPage - 返回有效 PNG', isValidPNG, `PNG签名: ${isValidPNG}`)
  report('fullPage - 文件已保存', fileExists && fileSize > 1000, `文件大小: ${(fileSize / 1024).toFixed(1)}KB`)
  report('fullPage - 数据大小合理', data.length > 10000, `数据大小: ${(data.length / 1024).toFixed(1)}KB`)
} catch (err: any) {
  report('fullPage', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 2: 全页 JPEG 截图
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 2: 全页 JPEG 截图 ━━━')
try {
  console.time('  fullPage JPEG 耗时')
  const filePath = path.join(outputDir, 'fullpage.jpeg')
  const { run } = await instance.screenshot({
    file: 'https://github.com',
    fullPage: true,
    type: 'jpeg',
    quality: 80,
    path: filePath,
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const data = await run()
  console.timeEnd('  fullPage JPEG 耗时')

  const isValidJPEG = isJPEG(data)
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

  report('fullPage JPEG - 返回有效 JPEG', isValidJPEG, `JPEG签名: ${isValidJPEG}`)
  report('fullPage JPEG - 文件大小合理', fileSize > 5000, `文件大小: ${(fileSize / 1024).toFixed(1)}KB`)
} catch (err: any) {
  report('fullPage JPEG', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 3: 视口分片截图 (viewport slicing)
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 3: 视口分片截图 (viewport slicing) ━━━')
try {
  console.time('  viewport slicing 耗时')
  const { run } = await instance.screenshotViewport({
    file: 'https://github.com',
    selector: 'body',
    viewportHeight: 800,
    type: 'png',
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const slices = await run()
  console.timeEnd('  viewport slicing 耗时')

  report('viewport - 返回数组', Array.isArray(slices), `类型: ${typeof slices}, isArray: ${Array.isArray(slices)}`)
  report('viewport - 分片数量 > 1', slices.length > 1, `分片数量: ${slices.length}`)

  // 保存每个分片并验证
  let allValid = true
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i] as Uint8Array
    const slicePath = path.join(outputDir, `viewport-slice-${i}.png`)
    fs.writeFileSync(slicePath, slice)
    if (!isPNG(slice)) {
      allValid = false
      report(`viewport - 分片 ${i} PNG 验证`, false, `无效 PNG 签名`)
    }
  }
  report('viewport - 所有分片都是有效 PNG', allValid, `${slices.length} 个分片全部有效`)

  // 验证分片大小
  const totalSize = slices.reduce((sum, s) => sum + s.length, 0)
  report('viewport - 总数据量合理', totalSize > 10000, `总大小: ${(totalSize / 1024).toFixed(1)}KB`)
} catch (err: any) {
  report('viewport slicing', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 4: 视口分片截图 - 不同高度
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 4: 视口分片截图 - 不同高度 ━━━')
try {
  console.time('  viewport 400px 耗时')
  const { run: run400 } = await instance.screenshotViewport({
    file: 'https://github.com',
    selector: 'body',
    viewportHeight: 400,
    type: 'png',
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const slices400 = await run400()
  console.timeEnd('  viewport 400px 耗时')

  console.time('  viewport 1600px 耗时')
  const { run: run1600 } = await instance.screenshotViewport({
    file: 'https://github.com',
    selector: 'body',
    viewportHeight: 1600,
    type: 'png',
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const slices1600 = await run1600()
  console.timeEnd('  viewport 1600px 耗时')

  report(
    'viewport - 400px 产生更多分片',
    slices400.length > slices1600.length,
    `400px: ${slices400.length} 片, 1600px: ${slices1600.length} 片`,
  )
} catch (err: any) {
  report('viewport 不同高度', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 5: 元素截图 (element selector)
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 5: 元素截图 (element selector) ━━━')
try {
  console.time('  element 截图耗时')
  const filePath = path.join(outputDir, 'element-header.png')
  const { run } = await instance.screenshot({
    file: 'https://github.com',
    selector: 'header',
    type: 'png',
    path: filePath,
    pageGotoParams: { timeout: 30000, waitUntil },
    waitForSelector: 'header',
  })
  const data = await run()
  console.timeEnd('  element 截图耗时')

  const isValid = isPNG(data)
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

  report('element header - 返回有效 PNG', isValid, `PNG签名: ${isValid}`)
  report('element header - 文件已保存', fileSize > 500, `文件大小: ${(fileSize / 1024).toFixed(1)}KB`)
  // 元素截图通常比全页截图小很多
  report('element header - 数据量较小(相对全页)', data.length < 500000, `大小: ${(data.length / 1024).toFixed(1)}KB`)
} catch (err: any) {
  report('element header', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 6: 元素截图 - main 区域
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 6: 元素截图 - main 区域 ━━━')
try {
  console.time('  element main 耗时')
  const filePath = path.join(outputDir, 'element-main.png')
  const { run } = await instance.screenshot({
    file: 'https://github.com',
    selector: 'main',
    type: 'png',
    path: filePath,
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
    waitForSelector: 'main',
  })
  const data = await run()
  console.timeEnd('  element main 耗时')

  const isValid = isPNG(data)
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

  report('element main - 返回有效 PNG', isValid, `PNG签名: ${isValid}`)
  report('element main - 文件已保存', fileSize > 1000, `文件大小: ${(fileSize / 1024).toFixed(1)}KB`)
} catch (err: any) {
  report('element main', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 测试 7: base64 编码截图
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 测试 7: base64 编码截图 ━━━')
try {
  console.time('  base64 耗时')
  const { run } = await instance.screenshot({
    file: 'https://github.com',
    fullPage: false,
    encoding: 'base64',
    type: 'png',
    pageGotoParams: { timeout: 30000, waitUntil: waitUntil },
  })
  const data = await run()
  console.timeEnd('  base64 耗时')

  const isString = typeof data === 'string'
  report('base64 - 返回字符串', isString, `类型: ${typeof data}`)

  if (isString) {
    const str = data as unknown as string
    const buffer = Buffer.from(str, 'base64')
    report('base64 - 可解码为有效 PNG', isPNG(new Uint8Array(buffer)), `解码大小: ${(buffer.length / 1024).toFixed(1)}KB`)
    report('base64 - 字符串长度合理', str.length > 1000, `长度: ${str.length}`)
  }
} catch (err: any) {
  report('base64 编码', false, `异常: ${err.message}`)
}

// ═══════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log(`📊 测试结果汇总 (${engine} 引擎)`)
console.log('═'.repeat(60))
for (const r of results) {
  console.log(`  ${r.status} ${r.name}`)
}
console.log('─'.repeat(60))
console.log(`  总计: ${passed + failed} | ✅ 通过: ${passed} | ❌ 失败: ${failed}`)
console.log('═'.repeat(60))
console.log(`\n📁 截图文件保存在: ${outputDir}`)

await instance.close()

if (failed > 0) {
  process.exit(1)
}

process.exit(0)
