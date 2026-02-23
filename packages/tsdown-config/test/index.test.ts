import { describe, it, expect } from 'vitest'
import { getPackageName, defineConfig, removeDebugPlugin } from '../src/index'

describe('tsdown-config', () => {
  describe('getPackageName', () => {
    it('应该返回普通包名', () => {
      expect(getPackageName('/path/to/node_modules/axios/index.js')).toBe('axios')
    })

    it('应该返回组织包名', () => {
      expect(getPackageName('/path/to/node_modules/@karinjs/axios/index.js')).toBe('@karinjs/axios')
    })

    it('没有 node_modules 时应该返回 null', () => {
      expect(getPackageName('/path/to/src/index.ts')).toBeNull()
    })

    it('应该处理 Windows 路径', () => {
      expect(getPackageName('D:\\project\\node_modules\\debug\\index.js')).toBe('debug')
    })

    it('组织包路径不完整时应该返回 null', () => {
      expect(getPackageName('/path/to/node_modules/@scope')).toBeNull()
    })

    it('node_modules 后无内容时应该返回 null', () => {
      expect(getPackageName('/path/to/node_modules/')).toBeNull()
    })
  })

  describe('defineConfig', () => {
    it('应该返回有效配置', () => {
      const config = defineConfig()
      expect(config).toBeDefined()
    })

    it('应该支持自定义入口', () => {
      const config = defineConfig({ entry: ['./src/main.ts'] })
      expect(config).toBeDefined()
    })
  })

  describe('removeDebugPlugin', () => {
    it('应该返回一个插件对象', () => {
      const plugin = removeDebugPlugin()
      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('remove-debug')
      expect(plugin.enforce).toBe('pre')
      expect(plugin.transform).toBeTypeOf('function')
    })

    it('不包含 debug 的代码应该返回 null', () => {
      const plugin = removeDebugPlugin()
      const result = plugin.transform('const x = 1', 'test.ts')
      expect(result).toBeNull()
    })

    it('应该移除 debug 导入', () => {
      const plugin = removeDebugPlugin()
      const code = `import debug from 'debug'\nconst debugLog = debug('test')\ndebugLog('hello')\nconsole.log('keep')`
      const result = plugin.transform(code, 'test.ts')
      expect(result).not.toBeNull()
      expect(result.code).not.toContain("import debug from 'debug'")
      expect(result.code).toContain('console.log')
    })

    it('非 TS/JS 文件应该返回 null', () => {
      const plugin = removeDebugPlugin()
      const result = plugin.transform('import debug from "debug"', 'test.css')
      expect(result).toBeNull()
    })
  })
})
