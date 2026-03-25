import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkDependencies, installDependencies, getLinuxDistro } from '../src/deps'

// 持有原始 platform
const originalPlatform = process.platform

function mockPlatform (platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true })
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true })
  vi.restoreAllMocks()
})

describe('deps', () => {
  describe('checkDependencies', () => {
    it('非 Linux 平台应直接返回 ok', () => {
      mockPlatform('win32')
      const result = checkDependencies('/fake/chrome')
      expect(result.ok).toBe(true)
      expect(result.missingLibraries).toEqual([])
      expect(result.missingPackages).toEqual([])
      expect(result.installCommand).toBeNull()
    })

    it('macOS 平台应直接返回 ok', () => {
      mockPlatform('darwin')
      const result = checkDependencies('/fake/chrome')
      expect(result.ok).toBe(true)
    })
  })

  describe('installDependencies', () => {
    it('非 Linux 平台应直接返回 true', () => {
      mockPlatform('win32')
      expect(installDependencies('/fake/chrome')).toBe(true)
    })

    it('macOS 平台应直接返回 true', () => {
      mockPlatform('darwin')
      expect(installDependencies('/fake/chrome')).toBe(true)
    })
  })

  describe('getLinuxDistro', () => {
    it('应返回包含 id 和 version 的对象', () => {
      const distro = getLinuxDistro()
      expect(distro).toHaveProperty('id')
      expect(distro).toHaveProperty('version')
      expect(typeof distro.id).toBe('string')
      expect(typeof distro.version).toBe('string')
    })

    it('非 Linux 应返回 unknown', () => {
      // 在 Windows 上 /etc/os-release 不存在，应该回退
      if (process.platform !== 'linux') {
        const distro = getLinuxDistro()
        expect(distro.id).toBe('unknown')
        expect(distro.version).toBe('')
      }
    })
  })

  describe('DepsCheckResult 结构', () => {
    it('ok 结果应有正确的结构', () => {
      mockPlatform('win32')
      const result = checkDependencies('/fake/chrome')
      expect(result).toEqual({
        ok: true,
        missingLibraries: [],
        missingPackages: [],
        unmappedLibraries: [],
        installCommand: null,
      })
    })
  })
})
