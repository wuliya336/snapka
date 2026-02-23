# @snapka/playwright-core

Playwright-core 的 re-export 包。

## 源码分析

本包仅负责 re-export `playwright-core`：

```ts
// src/index.ts
export { default } from 'playwright-core'
export * from 'playwright-core'
```

### 设计目的

- 统一包命名空间 `@snapka/playwright-core`
- 便于管理 playwright-core 版本
- 支持未来可能的自定义扩展

## 使用说明

```bash
pnpm add @snapka/playwright-core
```

```ts
import playwright from '@snapka/playwright-core'

const browser = await playwright.chromium.launch({
  executablePath: '/path/to/chrome',
})
```

## 构建

```bash
cd packages/playwright-core
pnpm build
```

## 测试

```bash
pnpm test
```

验证 `playwright-core` 的核心导出（`chromium`、`firefox`、`webkit`）可用。
