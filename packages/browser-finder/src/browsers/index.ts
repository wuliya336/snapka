/**
 * 系统浏览器查找器统一接口
 * 提供 Chrome、Edge、Brave 等系统安装浏览器的查找功能
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { findEdgeAll } from './edge'
import { findBraveAll } from './brave'
import { computeSystemExecutablePath, Browser, ChromeReleaseChannel } from '@snapka/browsers'

import type { BrowserInfo } from '../types/index'

export enum SystemBrowserType {
  Chrome = 'chrome',
  Edge = 'edge',
  Brave = 'brave',
}

/**
 * 系统浏览器查找器类
 * 统一管理 Chrome、Edge、Brave 等系统安装浏览器的查找功能
 */
export class SystemBrowserFinder {
  /**
   * 查找所有浏览器
   * @param options 查找选项
   * @returns 返回所有找到的浏览器信息
   */
  async find (): Promise<BrowserInfo[]> {
    return this.findSync()
  }

  /**
   * 查找所有浏览器(同步版本)
   * @param options 查找选项
   * @returns 返回所有找到的浏览器信息
   */
  findSync (): BrowserInfo[] {
    return [
      ...this.puppeteer(),
      ...this.findEdgeSync(),
      ...this.findBraveSync(),
    ]
  }

  /**
   * 查找 Chrome 浏览器
   * @param options 查找选项
   * @returns 返回所有找到的 Chrome 浏览器信息
   */
  async findChrome (): Promise<BrowserInfo[]> {
    return this.findChromeSync()
  }

  /**
   * 查找 Chrome 浏览器(同步版本)
   * @param options 查找选项
   * @returns 返回所有找到的 Chrome 浏览器信息
   */
  findChromeSync (): BrowserInfo[] {
    const results = this.puppeteer()
    return results
  }

  /**
   * 使用 Puppeteer 内部机制查找 Chrome 浏览器
   * @description puppeteer仅支持查找 Chrome 浏览器
   * @returns 返回所有找到的 Chrome 浏览器信息
   */
  private puppeteer () {
    const targets = [
      ChromeReleaseChannel.STABLE,
      ChromeReleaseChannel.BETA,
      ChromeReleaseChannel.DEV,
      ChromeReleaseChannel.CANARY,
    ]

    const results: BrowserInfo[] = []
    targets.forEach(channel => {
      try {
        const dir = computeSystemExecutablePath({ browser: Browser.CHROME, channel })
        if (!fs.existsSync(dir)) return

        results.push({
          type: SystemBrowserType.Chrome,
          executablePath: dir,
          // 系统浏览器的目录较为复杂，返回可执行文件所在目录的上一级目录
          dir: path.dirname(dir),
          get version () {
            // 使用 execFileSync 避免 shell 注入风险
            return execFileSync(dir, ['--version']).toString().trim().match(/\d+(?:\.\d+){2,3}/)?.[0] || ''
          },
        })
      } catch {
        // 忽略找不到的浏览器版本
      }
    })
    return results
  }

  /**
   * 查找 Edge 浏览器(同步版本)
   * @param options 查找选项
   * @returns 返回所有找到的 Edge 浏览器信息
   */
  findEdgeSync (): BrowserInfo[] {
    return findEdgeAll().map(file => ({
      type: SystemBrowserType.Edge,
      executablePath: file,
      dir: path.dirname(file),
      get version () {
        return '0.0.0.0'
      },
    }))
  }

  /**
   * 查找 Edge 浏览器
   * @param options 查找选项
   * @returns 返回所有找到的 Edge 浏览器信息
   */
  async findEdge (): Promise<BrowserInfo[]> {
    return this.findEdgeSync()
  }

  /**
   * 查找 Brave 浏览器(同步版本)
   * @param options 查找选项
   * @returns 返回所有找到的 Brave 浏览器信息
   */
  findBraveSync (): BrowserInfo[] {
    return findBraveAll().map(file => ({
      type: SystemBrowserType.Brave,
      executablePath: file,
      dir: path.dirname(file),
      get version () {
        return '0.0.0.0'
      },
    }))
  }

  /**
   * 查找 Brave 浏览器
   * @param options 查找选项
   * @returns 返回所有找到的 Brave 浏览器信息
   */
  async findBrave (): Promise<BrowserInfo[]> {
    return this.findBraveSync()
  }
}

/**
 * 系统浏览器查找器实例
 */
export const systemBrowserFinder = new SystemBrowserFinder()
