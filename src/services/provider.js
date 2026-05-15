import { env } from '../utils/env.js';

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

export function hasUpstreamConfig() {
  return Boolean(env.openaiBaseUrl && env.openaiApiKey);
}

export function requireUpstreamConfig() {
  if (!env.openaiBaseUrl || !env.openaiApiKey) {
    const missing = [
      !env.openaiBaseUrl ? 'OPENAI_BASE_URL' : null,
      !env.openaiApiKey ? 'OPENAI_API_KEY' : null
    ].filter(Boolean);
    const error = new Error(`Missing upstream configuration: ${missing.join(', ')}`);
    error.statusCode = 500;
    error.code = 'missing_upstream_config';
    throw error;
  }
}

export function buildUpstreamUrl(pathname) {
  requireUpstreamConfig();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${normalizeBaseUrl(env.openaiBaseUrl)}${path}`;
}

export function buildUpstreamHeaders(extraHeaders = {}) {
  requireUpstreamConfig();
  return {
    ...extraHeaders,
    Authorization: `Bearer ${env.openaiApiKey}`
  };
}

export async function fetchUpstream(pathname, options = {}) {
  const headers = buildUpstreamHeaders(options.headers || {});
  return fetch(buildUpstreamUrl(pathname), {
    ...options,
    headers
  });
}
