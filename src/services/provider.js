import { config, env } from '../utils/env.js';
import { loadDb, saveDb } from './db.js';

function getKeysFromEnv(envName) {
  return (process.env[envName] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveProviderByModel(model) {
  if (env.provider === 'third_party') {
    return 'third_party';
  }
  return config?.routing?.modelMap?.[model] || env.provider || config?.routing?.defaultProvider || 'openai';
}

export function getProviderConfig(providerName) {
  if (providerName === 'third_party') {
    return {
      label: 'Third-party OpenAI-compatible provider',
      baseUrl: env.thirdPartyApiBaseUrl,
      apiKeysEnv: env.thirdPartyApiKeysEnv,
      chatPath: '/chat/completions',
      embeddingsPath: '/embeddings',
      modelsPath: '/models',
      headers: {
        Authorization: 'Bearer {{apiKey}}'
      }
    };
  }

  const provider = config?.providers?.[providerName];
  if (!provider) {
    throw new Error(`Unsupported provider: ${providerName}`);
  }
  return provider;
}

export function getRotatedKey(providerName) {
  const db = loadDb();
  const provider = getProviderConfig(providerName);
  const keys = getKeysFromEnv(provider.apiKeysEnv);
  if (!keys.length) {
    throw new Error(`No API keys configured for provider: ${providerName}`);
  }
  const cursor = db.providerState?.[providerName]?.cursor || 0;
  const selectedKey = keys[cursor % keys.length];
  db.providerState[providerName] = { cursor: (cursor + 1) % keys.length };
  saveDb(db);
  return selectedKey;
}

export function buildProviderHeaders(providerName) {
  const provider = getProviderConfig(providerName);
  const apiKey = getRotatedKey(providerName);
  const headers = { 'Content-Type': 'application/json' };
  for (const [key, value] of Object.entries(provider.headers || {})) {
    headers[key] = value.replace('{{apiKey}}', apiKey);
  }
  return headers;
}

export function buildProviderRequest(providerName, endpointType, payload) {
  const provider = getProviderConfig(providerName);
  if (!provider.baseUrl) {
    throw new Error(`Missing base URL for provider: ${providerName}`);
  }
  const path = endpointType === 'embeddings' ? provider.embeddingsPath : provider.chatPath;
  const headers = buildProviderHeaders(providerName);
  return {
    url: `${provider.baseUrl}${path}`,
    options: {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }
  };
}

export async function fetchThirdPartyModels() {
  const provider = getProviderConfig('third_party');
  if (!provider.baseUrl) {
    throw new Error('Missing base URL for provider: third_party');
  }
  const headers = buildProviderHeaders('third_party');
  const response = await fetch(`${provider.baseUrl}${provider.modelsPath || '/models'}`, {
    method: 'GET',
    headers
  });
  const rawText = await response.text();
  let responseBody;
  try {
    responseBody = JSON.parse(rawText);
  } catch {
    responseBody = { raw: rawText };
  }

  if (!response.ok) {
    throw new Error(`Third-party models fetch failed: ${response.status}`);
  }

  return responseBody;
}
