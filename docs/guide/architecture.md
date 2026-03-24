# 架构概览

## Monorepo 结构

Snapka 采用 pnpm workspace monorepo 架构，各包职责清晰：

```
snapka/
├── packages/
│   ├── puppeteer/           # Puppeteer 截图引擎（主包）
│   ├── playwright/          # Playwright 截图引擎（主包）
│   ├── puppeteer-core/      # puppeteer-core 的 re-export
│   ├── playwright-core/     # playwright-core 的 re-export
│   ├── puppeteer-browsers/  # 浏览器下载管理
│   ├── browser-finder/      # 系统浏览器查找
│   ├── snapka-types/        # 共享类型定义
│   └── tsdown-config/       # 构建配置
└── docs/                    # 文档站（VitePress）
```

## 包依赖关系

```
snapka-types (类型定义)
    ↑
    ├── puppeteer ──→ puppeteer-core ──→ puppeteer (npm)
    │     ↑
    │     ├── browser-finder
    │     └── puppeteer-browsers (下载管理)
    │
    ├── playwright ──→ playwright-core ──→ playwright-core (npm)
    │     ↑
    │     ├── browser-finder
    │     └── puppeteer-browsers (下载管理)
```

## 核心流程

### 截图流程

1. **启动** — `snapka.launch()` 创建浏览器实例
2. **路径解析** — `SnapkaLaunch` / `PlaywrightLaunch` 解析浏览器路径
3. **页面管理** — `PuppeteerCore` / `PlaywrightCore` 管理页面池
4. **截图执行** — `screenshot()` / `screenshotViewport()` 执行截图

### 浏览器发现流程

1. **自定义路径** — 优先使用用户指定的 `executablePath`
2. **系统查找** — 通过 `@snapka/browser-finder` 查找已安装浏览器
3. **自动下载** — 通过 `@snapka/puppeteer-browsers` 下载浏览器

### 镜像探针流程

1. **URL 列表** — 阿里云镜像（优先）+ Google 源
2. **交错探测** — 阿里云立即发起，Google 延迟 300ms
3. **竞速选择** — `Promise.any()` 返回最先响应的源

## 构建系统

- **构建工具**: tsdown（基于 Rolldown）
- **类型检查**: TypeScript
- **测试框架**: Vitest
- **包管理**: pnpm workspace
- **代码规范**: ESLint
