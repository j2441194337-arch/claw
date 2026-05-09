import { config } from '../utils/env.js';
import { loadDb, saveDb } from './db.js';

function getKeysFromEnv(envName) {
  return (process.env[envName] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveProviderByModel(model) {
  return config?.routing?.modelMap?.[model] || config?.routing?.defaultProvider || 'openai';
}

export function getProviderConfig(providerName) {
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

export function buildProviderRequest(providerName, endpointType, payload) {
  const provider = getProviderConfig(providerName);
  const apiKey = getRotatedKey(providerName);
  const path = endpointType === 'embeddings' ? provider.embeddingsPath : provider.chatPath;
  const headers = { 'Content-Type': 'application/json' };
  for (const [key, value] of Object.entries(provider.headers || {})) {
    headers[key] = value.replace('{{apiKey}}', apiKey);
  }
  return {
    url: `${provider.baseUrl}${path}`,
    options: {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }
  };
}
