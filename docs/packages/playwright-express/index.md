# @snapka/playwright-express

基于 Playwright 引擎的 HTTP 截图服务。

## 源码分析

### 模块结构

与 `@snapka/puppeteer-express` 结构相同：

| 文件 | 作用 |
|------|------|
| `index.ts` | Express 服务启动入口 |
| `browser.ts` | `BrowserManager` 单例 — 浏览器生命周期管理 |
| `config.ts` | `loadConfig()` — 使用 cosmiconfig 加载配置 |
| `routes.ts` | REST API 路由定义 |
| `types.ts` | API 响应类型、状态码 |

### API 接口

与 puppeteer-express 完全一致：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/screenshot` | 页面截图 |
| GET | `/screenshot` | 页面截图（查询参数） |
| POST | `/screenshot/viewport` | 分片截图 |
| GET | `/screenshot/viewport` | 分片截图（查询参数） |
| GET | `/health` | 健康检查 |
| POST | `/browser/restart` | 重启浏览器 |

### 配置加载

配置文件名为 `playwright-express`：

```
.playwright-expressrc
.playwright-expressrc.json
playwright-express.config.js
```

## 使用说明

### 安装

```bash
pnpm add @snapka/playwright-express
```

### 启动

```bash
node dist/index.js
```

## 构建

```bash
cd packages/playwright-express
pnpm build
```

## 测试

```bash
pnpm test
```

### 测试覆盖

| 测试文件 | 覆盖内容 |
|----------|----------|
| `config.test.ts` | 默认配置、用户配置合并 |
| `types.test.ts` | StatusCode 枚举 |
