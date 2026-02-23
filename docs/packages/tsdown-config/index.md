# tsdown-config

共享 tsdown 构建配置。

## 源码分析

### 导出函数

#### defineConfig

创建标准化 tsdown 配置，预设以下默认值：

```ts
{
  entry: ['./src/index.ts'],
  dts: true,
  format: ['esm'],
  shims: true,
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  treeshake: true,
}
```

支持自定义 `chunks` 回调用于代码分割。

#### getPackageName

从文件路径中提取 npm 包名：

```ts
getPackageName('/path/node_modules/axios/index.js')     // 'axios'
getPackageName('/path/node_modules/@scope/pkg/index.js') // '@scope/pkg'
getPackageName('/path/src/index.ts')                     // null
```

#### removeDebugPlugin

使用 TypeScript Compiler API 在构建时移除 `debug` 模块的导入和调用：

- 移除 `import debug from 'debug'` 语句
- 移除 `const debugLog = debug('xxx')` 声明
- 移除 `debugLog('...')` 调用语句
- 移除相关 export 语句

## 使用说明

```ts
// tsdown.config.ts
import { defineConfig } from 'tsdown-config'

export default defineConfig({
  entry: ['./src/index.ts'],
  chunks: (id, pkg, name) => {
    if (pkg === 'axios') return 'vendor'
    return null
  },
})
```

## 测试

```bash
pnpm test
```

### 测试覆盖

| 测试 | 覆盖 |
|------|------|
| `getPackageName` | 普通包名、组织包名、Windows 路径、边界情况 |
| `defineConfig` | 默认配置生成、自定义入口 |
| `removeDebugPlugin` | 插件结构、debug 代码移除、非目标文件跳过 |
