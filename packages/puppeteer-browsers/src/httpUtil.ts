/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { URL } from 'node:url'
import axios from '@karinjs/axios'
import { createWriteStream } from 'node:fs'

/**
 * HEAD 请求判断 URL 是否存在
 */
export async function headHttpRequest (url: URL | string): Promise<boolean> {
  try {
    const response = await axios.head(url.toString(), {
      validateStatus: (status) => status === 200,
    })
    return response.status === 200
  } catch {
    return false
  }
}

/**
 * 下载文件，支持进度回调
 */
export async function downloadFile (
  url: URL | string,
  destinationPath: string,
  progressCallback?: (downloadedBytes: number, totalBytes: number) => void
): Promise<void> {
  const response = await axios.get(url.toString(), {
    responseType: 'stream',
    onDownloadProgress: progressCallback
      ? (progressEvent) => {
        const totalBytes = progressEvent.total || 0
        const downloadedBytes = progressEvent.loaded
        progressCallback(downloadedBytes, totalBytes)
      }
      : undefined,
    validateStatus: (status) => status >= 200 && status < 400,
  })

  if (response.status !== 200) {
    throw new Error(`Download failed: server returned code ${response.status}. URL: ${url}`)
  }

  const file = createWriteStream(destinationPath)
  response.data.pipe(file)

  return new Promise<void>((resolve, reject) => {
    file.on('close', resolve)
    file.on('error', reject)
  })
}

/**
 * 获取 JSON 数据
 */
export async function getJSON (url: URL | string): Promise<unknown> {
  try {
    const response = await axios.get(url.toString(), {
      validateStatus: (status) => status >= 200 && status < 400,
    })
    return response.data
  } catch (error) {
    throw new Error('Could not parse JSON from ' + url.toString())
  }
}

/**
 * 获取文本数据
 */
export async function getText (url: URL | string): Promise<string> {
  try {
    const response = await axios.get(url.toString(), {
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    })
    return String(response.data)
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status) {
      throw new Error(`Got status code ${error.response.status}`)
    }
    throw new Error('Failed to fetch text from ' + url.toString())
  }
}

/**
 * URL 探针：返回第一个符合状态码条件的 URL
 *
 * 优先使用列表中靠前的 URL（默认阿里云镜像），
 * 后续 URL 会延迟发起请求，给优先源一个时间窗口。
 *
 * @param urls - 要检测的 URL 列表（靠前的优先级更高）
 * @param options - 配置选项
 * @returns 第一个成功的 URL，如果全部失败则抛出错误
 */
export async function probeUrls (
  urls: (URL | string)[],
  options?: {
    validStatusCodes?: number[]
    timeout?: number
    /** 每个后续 URL 相对于前一个的延迟（ms） @default 300 */
    staggerDelay?: number
  }
): Promise<string> {
  const { validStatusCodes = [200], timeout = 5000, staggerDelay = 300 } = options || {}

  if (urls.length === 0) {
    throw new Error('URL list cannot be empty')
  }

  const probePromises = urls.map(async (url, index) => {
    // 后续 URL 延迟发起，给优先源一个时间窗口
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, staggerDelay * index))
    }
    try {
      const response = await axios.head(url.toString(), {
        timeout,
        validateStatus: (status) => validStatusCodes.includes(status),
      })

      if (validStatusCodes.includes(response.status)) {
        return url.toString()
      }

      throw new Error(`Invalid status code: ${response.status}`)
    } catch (error: any) {
      throw new Error(`Failed to probe ${url}: ${error.message}`)
    }
  })

  return Promise.any(probePromises)
}
