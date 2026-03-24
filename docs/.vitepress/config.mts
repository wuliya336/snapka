import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Snapka',
  description: '高性能浏览器截图工具集',
  lang: 'zh-CN',
  base: '/snapka/',
  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/packages/puppeteer/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '架构概览', link: '/guide/architecture' },
          ],
        },
      ],
      '/packages/': [
        {
          text: '核心包',
          items: [
            { text: '@snapka/puppeteer', link: '/packages/puppeteer/' },
            { text: '@snapka/playwright', link: '/packages/playwright/' },
            { text: '@snapka/types', link: '/packages/types/' },
          ],
        },
        {
          text: '浏览器管理',
          items: [
            { text: '@snapka/browser-finder', link: '/packages/browser-finder/' },
            { text: '@snapka/puppeteer-browsers', link: '/packages/puppeteer-browsers/' },
          ],
        },
        {
          text: '底层封装',
          items: [
            { text: '@snapka/puppeteer-core', link: '/packages/puppeteer-core/' },
            { text: '@snapka/playwright-core', link: '/packages/playwright-core/' },
          ],
        },
        {
          text: '工具包',
          items: [
            { text: 'tsdown-config', link: '/packages/tsdown-config/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/KarinJS/snapka' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present KarinJS',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },
  },
})
