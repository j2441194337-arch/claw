import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import openAiRoutes from './routes/openai.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenClaw / claw</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0b1020;
        --panel: #121933;
        --text: #eaf0ff;
        --muted: #a7b4d6;
        --accent: #6ea8fe;
        --ok: #57d39b;
        --warn: #ffd166;
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
      }
      body {
        margin: 0;
        background: linear-gradient(180deg, #0b1020 0%, #121933 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero, .card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        padding: 24px;
        backdrop-filter: blur(8px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
      }
      .hero h1 { margin: 0 0 10px; font-size: 40px; }
      .hero p { margin: 0; color: var(--muted); line-height: 1.7; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
        margin-top: 18px;
      }
      h2 { margin-top: 0; font-size: 20px; }
      ul { margin: 0; padding-left: 18px; line-height: 1.8; }
      .pill {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        margin: 6px 8px 0 0;
        background: rgba(110,168,254,0.14);
        color: var(--accent);
        font-size: 14px;
      }
      a { color: #9ec5fe; }
      code {
        background: rgba(255,255,255,0.08);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .ok { color: var(--ok); }
      .warn { color: var(--warn); }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <h1>OpenClaw / claw</h1>
        <p>一个面向最小人工介入运营的 GitHub API 网站与 AI API 代理项目。当前重点是把本地 MVP 整理为可推送 GitHub、可导入 Vercel、可公开展示的上线版本。</p>
        <div>
          <span class="pill">GitHub 网站搭建</span>
          <span class="pill">AI API 代理</span>
          <span class="pill">多 provider 路由</span>
          <span class="pill">Key 轮换</span>
          <span class="pill">日志记录</span>
          <span class="pill">管理接口</span>
          <span class="pill">后续支持 PPT / Excel 输出</span>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h2>当前状态</h2>
          <ul>
            <li><span class="ok">本地 MVP 已完成</span></li>
            <li><span class="warn">待推送 GitHub</span></li>
            <li><span class="warn">待导入 Vercel</span></li>
          </ul>
        </article>

        <article class="card">
          <h2>API 文档入口</h2>
          <ul>
            <li><a href="/api/health"><code>/api/health</code></a></li>
            <li><a href="/api/status"><code>/api/status</code></a></li>
            <li><code>POST /v1/chat/completions</code></li>
            <li><code>POST /v1/embeddings</code></li>
            <li><code>GET /v1/models</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>安全提示</h2>
          <ul>
            <li>所有密钥只放服务端环境变量</li>
            <li>前端不暴露 token</li>
            <li>README、页面、日志中不写真实 API key / GitHub Token / Cookie / 密码</li>
          </ul>
        </article>
      </section>
    </main>
  </body>
</html>`);
});

app.use('/v1', openAiRoutes);
app.use('/', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

export default app;
