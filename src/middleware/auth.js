import { getUserByApiKey, requirePositiveBalance } from '../services/users.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Missing API key' } });
  }

  const user = getUserByApiKey(apiKey);
  if (!user) {
    return res.status(401).json({ error: { message: 'Invalid API key' } });
  }

  if (!requirePositiveBalance(user)) {
    return res.status(402).json({ error: { message: 'Insufficient balance' } });
  }

  req.user = user;
  next();
}
