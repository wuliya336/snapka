import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeUrls, headHttpRequest, getJSON, getText } from '../src/httpUtil'

// Mock axios
vi.mock('@karinjs/axios', () => {
  const mockAxios: any = {
    head: vi.fn(),
    get: vi.fn(),
    isAxiosError: vi.fn(() => false),
  }
  return { default: mockAxios }
})

import axios from '@karinjs/axios'

describe('httpUtil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('headHttpRequest', () => {
    it('应该在 200 时返回 true', async () => {
      vi.mocked(axios.head).mockResolvedValue({ status: 200 })
      expect(await headHttpRequest('https://example.com')).toBe(true)
    })

    it('应该在请求失败时返回 false', async () => {
      vi.mocked(axios.head).mockRejectedValue(new Error('network error'))
      expect(await headHttpRequest('https://example.com')).toBe(false)
    })

    it('应该支持 URL 对象', async () => {
      vi.mocked(axios.head).mockResolvedValue({ status: 200 })
      expect(await headHttpRequest(new URL('https://example.com'))).toBe(true)
      expect(axios.head).toHaveBeenCalledWith('https://example.com/', expect.any(Object))
    })
  })

  describe('getJSON', () => {
    it('应该返回解析后的 JSON 数据', async () => {
      const data = { name: 'test', version: '1.0.0' }
      vi.mocked(axios.get).mockResolvedValue({ status: 200, data })
      expect(await getJSON('https://example.com/data.json')).toEqual(data)
    })

    it('应该在解析失败时抛出错误', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('parse error'))
      await expect(getJSON('https://example.com/data.json')).rejects.toThrow('Could not parse JSON')
    })
  })

  describe('getText', () => {
    it('应该返回文本数据', async () => {
      vi.mocked(axios.get).mockResolvedValue({ status: 200, data: 'Hello World' })
      expect(await getText('https://example.com/text')).toBe('Hello World')
    })

    it('应该在请求失败时抛出错误', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('request failed'))
      await expect(getText('https://example.com/text')).rejects.toThrow('Failed to fetch text')
    })
  })

  describe('probeUrls', () => {
    it('空 URL 列表应该抛出错误', async () => {
      await expect(probeUrls([])).rejects.toThrow('URL list cannot be empty')
    })

    it('应该返回第一个可用的 URL', async () => {
      vi.mocked(axios.head).mockResolvedValue({ status: 200 })
      const result = await probeUrls(['https://mirror.example.com', 'https://origin.example.com'])
      expect(result).toBe('https://mirror.example.com')
    })

    it('当第一个 URL 失败时应该回退到第二个', async () => {
      vi.useFakeTimers()
      vi.mocked(axios.head)
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ status: 200 })

      const promise = probeUrls(
        ['https://failed.example.com', 'https://ok.example.com'],
        { staggerDelay: 0 }
      )
      await vi.advanceTimersByTimeAsync(100)
      const result = await promise
      expect(result).toBe('https://ok.example.com')
    })

    it('所有 URL 都失败时应该抛出 AggregateError', async () => {
      vi.mocked(axios.head).mockRejectedValue(new Error('all failed'))
      await expect(
        probeUrls(['https://a.com', 'https://b.com'], { staggerDelay: 0 })
      ).rejects.toThrow()
    })

    it('应该支持自定义状态码', async () => {
      vi.mocked(axios.head).mockResolvedValue({ status: 403 })
      const result = await probeUrls(
        ['https://example.com'],
        { validStatusCodes: [403] }
      )
      expect(result).toBe('https://example.com')
    })

    it('应该支持自定义超时', async () => {
      vi.mocked(axios.head).mockResolvedValue({ status: 200 })
      await probeUrls(['https://example.com'], { timeout: 1000 })
      expect(axios.head).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ timeout: 1000 })
      )
    })
  })
})
