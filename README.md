# ai-api-proxy

一个基于 **Node.js + Express** 的 **OpenAI 兼容 AI API 中转交易平台**，适合用 **Vercel 部署**，支持多模型后端切换、API Key 轮换、用户余额扣费、请求日志和每日用量统计。

## 核心能力

- OpenAI 兼容协议：
  - `POST /v1/chat/completions`
  - `POST /v1/embeddings`
  - `GET /v1/models`
- 多后端路由：OpenAI、Anthropic、Google、国内兼容模型
- 模型到供应商映射：`config.json` 中切换
- 多 Key 轮换：按 provider 自动轮转 API Key
- 基础用户系统：API Key、余额、套餐、月度用量
- 扣费逻辑：按请求类型 + markup 加价计费
- 用量日志：请求日志 + 每日营收/调用统计
- 管理端接口：
  - `GET /admin/users`
  - `GET /admin/stats`

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

健康检查：

```bash
GET /health
```

## 环境变量

参考 `.env.example`：

- `PROVIDER`：默认供应商
- `OPENAI_API_KEYS`：多个 key 用逗号分隔
- `ANTHROPIC_API_KEYS`
- `GOOGLE_API_KEYS`
- `DOMESTIC_API_KEYS`
- `ADMIN_SECRET`：后台接口密钥
- `DEFAULT_MARKUP_RATE`：加价倍率
- `DEFAULT_SUBSCRIPTION_MONTHLY`：默认订阅价格

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

## 配置多后端

在 `config.json` 中：

- `providers`：配置后端 baseUrl、headers、chat/embedding 路径
- `routing.modelMap`：不同模型名映射到不同 provider
- `pricing`：配置基础价格、加价倍率、订阅价

## 盈利模式建议

本项目当前默认支持两种基础盈利逻辑：

### 1. 加价转售

- 上游模型按真实成本采购
- 下游调用时按 `base x markupRate` 收费
- 适合按量计费客户

### 2. 基础订阅盈利

可设置套餐：

- Basic：月费 29
- Pro：月费 99

建议组合：

- 订阅提供基础额度
- 超额调用再按量收费
- 企业客户单独谈专线/高配额度

## 管理端接口

### 查看用户

```bash
curl http://localhost:3000/admin/users -H "x-admin-secret: change-me"
```

### 查看统计

```bash
curl http://localhost:3000/admin/stats -H "x-admin-secret: change-me"
```

## Vercel 部署

1. 将项目推送到 GitHub
2. 导入到 Vercel
3. 在 Vercel 设置环境变量
4. 部署完成后即可通过域名访问

> 注意：Vercel 无状态，`data/db.json` 和 `logs/` 只适合 MVP / 演示环境。
> 真正商用建议替换为：
>
> - PostgreSQL / MySQL / Supabase / Neon
> - Redis 做限流与缓存
> - Stripe / Paddle / LemonSqueezy 做订阅收费
> - 对象存储做日志归档

## 下一步建议

第二阶段建议继续生成：

- 用户注册登录
- 套餐订阅与支付页
- 前端管理后台
- 充值、账单、调用明细
- Key 管理 UI
- 限流、风控、告警

## 免责声明

请确保你的中转、转售和计费行为符合上游模型供应商协议、所在司法辖区法律法规以及客户隐私合规要求。
