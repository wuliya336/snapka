# @snapka/puppeteer-core

Puppeteer-core 的 re-export 包。

## 源码分析

本包仅负责 re-export `puppeteer-core`，不包含额外逻辑：

```ts
// src/index.ts
export { default } from 'puppeteer-core'
export * from 'puppeteer-core'
```

### 设计目的

- 统一包命名空间 `@snapka/puppeteer-core`
- 便于管理 puppeteer-core 版本
- 支持未来可能的自定义扩展

## 使用说明

```bash
pnpm add @snapka/puppeteer-core
```

```ts
import puppeteer from '@snapka/puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/path/to/chrome',
})
```

## 构建

```bash
cd packages/puppeteer-core
pnpm build
```

## 测试

```bash
pnpm test
```

验证 `puppeteer-core` 的核心导出（`launch`、`connect`）可用。
