---
layout: home

hero:
  name: Snapka
  text: 高性能浏览器截图工具集
  tagline: 基于 Puppeteer 和 Playwright 的 Node.js 截图引擎，支持自动镜像选择和浏览器管理
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 文档
      link: /packages/puppeteer/
    - theme: alt
      text: GitHub
      link: https://github.com/KarinJS/snapka

features:
  - icon: 🚀
    title: 双引擎支持
    details: 同时支持 Puppeteer 和 Playwright 两大浏览器自动化引擎，统一接口
  - icon: 🔍
    title: 智能浏览器发现
    details: 自动查找系统已安装的浏览器（Chrome、Edge、Brave、Chromium），无需手动配置
  - icon: 🌐
    title: 自动镜像选择
    details: 内置探针机制，自动选择最快的下载源（默认阿里云 npmmirror）
  - icon: 📸
    title: 丰富截图能力
    details: 支持全页截图、元素截图、分片截图，可配置透明背景、质量等参数
  - icon: 🔄
    title: 页面池管理
    details: 智能页面复用与空闲回收，减少浏览器资源消耗
  - icon: 🌍
    title: HTTP API 服务
    details: 开箱即用的 Express 服务，支持 REST API 调用截图功能
---
