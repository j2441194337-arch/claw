import { env } from '../utils/env.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Missing API key', code: 'missing_api_key' } });
  }

  if (!env.apiKeys.includes(apiKey)) {
    return res.status(401).json({ error: { message: 'Invalid API key', code: 'invalid_api_key' } });
  }

  next();
}
