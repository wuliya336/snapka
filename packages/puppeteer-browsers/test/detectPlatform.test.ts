import { describe, it, expect, vi } from 'vitest'
import { detectBrowserPlatform } from '../src/detectPlatform'
import { BrowserPlatform } from '../src/browser-data/types'

describe('detectBrowserPlatform', () => {
  it('应该在 Windows x64 上返回 WIN64', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32' as any)
    const os = require('node:os')
    vi.spyOn(os, 'platform').mockReturnValue('win32')
    vi.spyOn(os, 'arch').mockReturnValue('x64')

    expect(detectBrowserPlatform()).toBe(BrowserPlatform.WIN64)
  })

  it('应该返回有效的 BrowserPlatform 值', () => {
    const result = detectBrowserPlatform()
    if (result) {
      expect(Object.values(BrowserPlatform)).toContain(result)
    }
  })
})
