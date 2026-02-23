# @snapka/puppeteer-express

基于 Puppeteer 引擎的 HTTP 截图服务。

## 源码分析

### 模块结构

| 文件 | 作用 |
|------|------|
| `index.ts` | Express 服务启动入口 |
| `browser.ts` | `BrowserManager` 单例 — 浏览器生命周期管理 |
| `config.ts` | `loadConfig()` — 使用 cosmiconfig 加载配置 |
| `routes.ts` | REST API 路由定义 |
| `types.ts` | API 响应类型、状态码 |

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/screenshot` | 页面截图 |
| GET | `/screenshot` | 页面截图（查询参数） |
| POST | `/screenshot/viewport` | 分片截图 |
| GET | `/screenshot/viewport` | 分片截图（查询参数） |
| GET | `/health` | 健康检查 |
| POST | `/browser/restart` | 重启浏览器 |

### 配置加载

使用 cosmiconfig 支持多种配置文件格式：

```
.puppeteer-expressrc
.puppeteer-expressrc.json
.puppeteer-expressrc.yaml
puppeteer-express.config.js
puppeteer-express.config.ts
```

默认配置：

```ts
{
  server: {
    port: 3000,
    host: '0.0.0.0',
    enableLogging: true,
  },
  browser: {
    headless: 'shell',
    maxOpenPages: 10,
    pageMode: 'reuse',
    pageIdleTimeout: 60000,
  },
}
```

## 使用说明

### 安装

```bash
pnpm add @snapka/puppeteer-express
```

### 启动服务

```bash
node dist/index.js
```

### API 示例

```bash
# POST 截图
curl -X POST http://localhost:3000/screenshot \
  -H 'Content-Type: application/json' \
  -d '{"file": "https://example.com", "type": "png", "fullPage": true}'

# GET 截图（流式）
curl "http://localhost:3000/screenshot?file=https://example.com&type=png&stream=true" \
  -o screenshot.png

# 健康检查
curl http://localhost:3000/health
```

## 构建

```bash
cd packages/puppeteer-express
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
