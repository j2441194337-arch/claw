# OpenClaw API Proxy

OpenClaw is a third-party OpenAI-compatible API proxy and distribution service.

Users call this service with a platform API key from `API_KEYS`. OpenClaw validates that key, forwards the request to the upstream OpenAI-compatible provider using `OPENAI_BASE_URL` and `OPENAI_API_KEY`, then returns the upstream response to the user.

This project is not wired directly to the official OpenAI API by default. It is designed for third-party platforms that expose OpenAI-compatible `/v1` endpoints.

## API Endpoints

- `GET /api/health`
- `GET /api/status`
- `GET /v1/models`
- `POST /v1/chat/completions`

## Environment Variables

Set these in Vercel Environment Variables:

```bash
NODE_ENV=production
PORT=3000
API_KEYS=platform-user-key-1,platform-user-key-2
OPENAI_API_KEY=third-party-upstream-key
OPENAI_BASE_URL=https://third-party.example.com/v1
```

Notes:

- `API_KEYS` is for users of your platform. Multiple keys are comma-separated.
- `OPENAI_API_KEY` is the real upstream provider key. Keep it only in server-side environment variables.
- `OPENAI_BASE_URL` should point to the upstream OpenAI-compatible base URL, usually ending at `/v1`.
- Do not set `OPENAI_BASE_URL` to `/v1/chat/completions`; the app appends `/chat/completions` itself.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Then visit:

- `http://localhost:3000/`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/status`

## User Chat Call

Users call `POST /v1/chat/completions` with one of the platform keys from `API_KEYS`.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer platform-user-key-1" \
  -d '{
    "model": "third-party-original-model-name",
    "messages": [
      {
        "role": "user",
        "content": "hello"
      }
    ]
  }'
```

The `model` value is forwarded exactly as provided. Use the original model name supported by the third-party provider.

## Models

`GET /v1/models` forwards to:

```text
OPENAI_BASE_URL + /models
```

The upstream response is returned to the user. This project does not use `MODEL_ALIASES`, and it does not map custom names such as `claw-fast` or `claw-pro`.

## Vercel Deployment

Recommended Vercel settings:

- Root Directory: `./`
- Application Preset: `Other`
- Install Command: `npm install`
- Build Command: leave empty
- Output Directory: leave empty

The project uses `vercel.json` to route all requests to `src/server.js` through `@vercel/node`. `src/server.js` exports the Express app for Vercel and only starts a listener during local execution.

After importing the GitHub repository into Vercel, fill these environment variables before deploying:

- `NODE_ENV=production`
- `PORT=3000`
- `API_KEYS`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`

## Security

- Do not commit `.env`, `.vercel/`, `node_modules/`, logs, real keys, cookies, or tokens.
- Do not put the real `OPENAI_API_KEY` in README, source code, frontend pages, logs, or GitHub commits.
- Do not give the upstream provider key to users.
- Users should only receive platform API keys that appear in `API_KEYS`.
- Error responses must not include `OPENAI_API_KEY`.

## Tests

```bash
npm test
```

The test suite covers health/status endpoints, platform-key authentication, `/v1/models` upstream forwarding, and `/v1/chat/completions` model pass-through behavior.
