import { env } from '../utils/env.js';

export function adminMiddleware(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== env.adminSecret) {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }
  next();
}
