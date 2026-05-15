import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import openAiRoutes from './routes/openai.js';
import statusRoutes from './routes/status.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenClaw API Proxy</title>
    <style>
      :root {
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
        color: #17202a;
        background: #f6f7f4;
      }
      body {
        margin: 0;
        background: #f6f7f4;
        color: #17202a;
      }
      .wrap {
        max-width: 1040px;
        margin: 0 auto;
        padding: 36px 20px 56px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 28px;
        align-items: center;
        padding: 28px 0 34px;
        border-bottom: 1px solid #d8ddd2;
      }
      .hero h1 {
        margin: 0 0 12px;
        font-size: clamp(36px, 7vw, 72px);
        line-height: 0.95;
      }
      .hero p {
        max-width: 720px;
        margin: 0;
        color: #56616f;
        line-height: 1.7;
        font-size: 18px;
      }
      .flow {
        background: #ffffff;
        border: 1px solid #d8ddd2;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 16px 40px rgba(28, 38, 27, 0.08);
      }
      .node {
        border: 1px solid #d8ddd2;
        border-radius: 8px;
        padding: 12px 14px;
        background: #f9faf7;
        font-weight: 700;
      }
      .arrow {
        color: #6f7a65;
        margin: 9px 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-top: 26px;
      }
      .card {
        background: #ffffff;
        border: 1px solid #d8ddd2;
        border-radius: 8px;
        padding: 20px;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      p, li {
        line-height: 1.7;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      a {
        color: #0f766e;
        font-weight: 700;
      }
      code, pre {
        font-family: "SFMono-Regular", Consolas, monospace;
        background: #eef2ea;
        border-radius: 6px;
      }
      code {
        padding: 2px 6px;
      }
      pre {
        margin: 12px 0 0;
        padding: 14px;
        overflow-x: auto;
        white-space: pre-wrap;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: #ffefc2;
        color: #6f4d00;
        font-size: 14px;
        font-weight: 700;
      }
      @media (max-width: 760px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <div>
          <span class="badge">OpenAI-compatible API proxy</span>
          <h1>OpenClaw API Proxy</h1>
          <p>
            A public API service front door for third-party OpenAI-compatible platforms.
            Users call OpenClaw with a platform API key, OpenClaw validates the key,
            forwards the request to the upstream provider with <code>OPENAI_API_KEY</code>,
            and returns the upstream response without exposing provider secrets.
          </p>
        </div>
        <div class="flow" aria-label="Proxy request flow">
          <div class="node">Client: Bearer API_KEYS value</div>
          <div class="arrow">down</div>
          <div class="node">OpenClaw: auth and proxy</div>
          <div class="arrow">down</div>
          <div class="node">Third-party: OPENAI_BASE_URL</div>
          <div class="arrow">down</div>
          <div class="node">OpenAI-compatible response</div>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Service</h2>
          <p>
            The requested <code>model</code> is forwarded exactly as provided.
            No <code>MODEL_ALIASES</code>, no custom <code>claw-fast</code> or
            <code>claw-pro</code> model mapping.
          </p>
        </article>

        <article class="card">
          <h2>Endpoints</h2>
          <ul>
            <li><a href="/api/health"><code>GET /api/health</code></a></li>
            <li><a href="/api/status"><code>GET /api/status</code></a></li>
            <li><code>GET /v1/models</code></li>
            <li><code>POST /v1/chat/completions</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>Call Pattern</h2>
          <pre>curl /v1/chat/completions
  -H "Authorization: Bearer platform-user-key"
  -H "Content-Type: application/json"
  -d '{"model":"upstream-model","messages":[{"role":"user","content":"hello"}]}'</pre>
        </article>

        <article class="card">
          <h2>Configuration</h2>
          <ul>
            <li><code>API_KEYS</code> contains platform user keys.</li>
            <li><code>OPENAI_BASE_URL</code> points to the upstream <code>/v1</code>.</li>
            <li><code>OPENAI_API_KEY</code> stays server-side only.</li>
          </ul>
        </article>

        <article class="card">
          <h2>Security</h2>
          <ul>
            <li>Do not commit <code>.env</code>, real API keys, cookies, or tokens.</li>
            <li>Do not send the upstream provider key to users.</li>
            <li>Users only receive platform API keys from <code>API_KEYS</code>.</li>
          </ul>
        </article>
      </section>
    </main>
  </body>
</html>`);
});

app.use('/v1', openAiRoutes);
app.use('/', statusRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'not_found' } });
});

export default app;
