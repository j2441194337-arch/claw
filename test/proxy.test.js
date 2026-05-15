import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.API_KEYS = 'platform-test-key,second-platform-key';
process.env.OPENAI_API_KEY = 'upstream-test-key';
process.env.OPENAI_BASE_URL = 'https://upstream.example/v1/';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health and status endpoints are public', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'openclaw');

  const status = await fetch(`${baseUrl}/api/status`);
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.ok, true);
  assert.equal(body.stage, 'production-ready');
});

test('models requires a platform API key', async () => {
  const response = await fetch(`${baseUrl}/v1/models`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'missing_api_key');
});

test('models proxies to OPENAI_BASE_URL /models with upstream auth', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://upstream.example/v1/models');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer upstream-test-key');
    return new Response(JSON.stringify({
      object: 'list',
      data: [{ id: 'vendor-model', object: 'model' }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  try {
    const response = await realFetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: 'Bearer platform-test-key' }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      object: 'list',
      data: [{ id: 'vendor-model', object: 'model' }]
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('chat completions forwards model unchanged and hides upstream key', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://upstream.example/v1/chat/completions');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer upstream-test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'third-party-original-model');
    return new Response(JSON.stringify({
      id: 'chatcmpl_test',
      object: 'chat.completion',
      model: body.model,
      choices: [{ message: { role: 'assistant', content: 'ok' } }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  try {
    const response = await realFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer second-platform-key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'third-party-original-model',
        messages: [{ role: 'user', content: 'hello' }]
      })
    });

    assert.equal(response.status, 200);
    const responseText = await response.text();
    assert.match(responseText, /third-party-original-model/);
    assert.doesNotMatch(responseText, /upstream-test-key/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
