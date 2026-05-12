# OpenClaw / claw

一个基于 **Node.js + Express** 的 **GitHub API 网站 + OpenAI 兼容 AI API 代理项目**，目标是实现最小人工介入的网站运营、接口管理与后续可扩展能力。

## 当前能力

- GitHub 网站搭建
- AI API 代理
- 多 provider 路由
- Key 轮换
- 日志记录
- 管理接口
- 后续支持 PPT / Excel 输出

## 当前状态

- 本地 MVP 已完成
- 待推送 GitHub
- 待导入 Vercel

## API 入口

- `GET /api/health`
- `GET /api/status`
- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- `GET /v1/models`
- `GET /health`

## 安全说明

- 所有密钥只放服务端环境变量
- 前端不暴露 token
- 严禁把真实 API key、GitHub token、cookie、账号密码写入 README、页面、日志或 git commit

## 项目结构

```bash
ai-api-proxy/
├─ src/
│  ├─ middleware/
│  ├─ routes/
│  ├─ services/
│  ├─ utils/
│  ├─ app.js
│  └─ server.js
├─ data/db.json
├─ logs/
├─ scripts/seed.js
├─ config.json
├─ .env.example
├─ vercel.json
└─ README.md
```

## 本地启动

```bash
npm install
cp .env.example .env
npm run start
```

默认端口：`3000`

## 环境变量

参考 `.env.example`：

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`
- `ADMIN_TOKEN`
- `DEFAULT_PROVIDER`
- `NODE_ENV`
- `OPENAI_API_KEYS`
- `ANTHROPIC_API_KEYS`
- `GOOGLE_API_KEYS`
- `DOMESTIC_API_KEYS`
- `ADMIN_SECRET`
- `JSON_DB_PATH`
- `REQUEST_LOG_PATH`
- `DAILY_STATS_PATH`
- `DEFAULT_MARKUP_RATE`
- `DEFAULT_SUBSCRIPTION_MONTHLY`

## OpenAI 兼容调用示例

### Chat Completions

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer proxy_demo_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "hello"}],
    "max_tokens": 200
  }'
```

### Embeddings

```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Authorization: Bearer proxy_demo_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "OpenAI compatible proxy"
  }'
```

## Vercel 部署

1. 将项目推送到 GitHub
2. 导入到 Vercel
3. 在 Vercel 设置环境变量
4. 部署完成后通过域名访问
5. 验证 `/api/health` 与核心代理接口

> 注意：Vercel 无状态，`data/db.json` 和 `logs/` 只适合 MVP / 演示环境。
> 真正商用建议替换为数据库、对象存储、限流缓存与正式计费系统。

## 下一步建议

- 创建 GitHub 仓库并推送 `main`
- 导入 Vercel
- 配置生产环境变量
- 验证线上 `/api/health`
- 验证线上 API 代理链路
- 补前端管理后台 / Key 管理 UI / 支付与账单能力
