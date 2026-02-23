import { describe, it, expect } from 'vitest'
import { StatusCode } from '../src/types'

describe('playwright-express/types', () => {
  describe('StatusCode', () => {
    it('应该定义正确的状态码', () => {
      expect(StatusCode.SUCCESS).toBe(200)
      expect(StatusCode.BAD_REQUEST).toBe(400)
      expect(StatusCode.INTERNAL_ERROR).toBe(500)
    })
  })
})
