import { Router } from 'express';
import { adminMiddleware } from '../middleware/admin.js';
import { loadDb } from '../services/db.js';
import { getDailyStats } from '../services/billing.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-api-proxy', time: new Date().toISOString() });
});

router.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'openclaw',
    time: new Date().toISOString(),
    version: 'mvp'
  });
});

router.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stage: 'local-mvp-ready',
    github: 'pending-push',
    vercel: 'pending-import'
  });
});

router.get('/admin/users', adminMiddleware, (req, res) => {
  const db = loadDb();
  res.json({ users: db.users, subscriptions: db.subscriptions });
});

router.get('/admin/stats', adminMiddleware, (req, res) => {
  const db = loadDb();
  res.json({
    totals: {
      users: db.users.length,
      usageRecords: db.usage.length
    },
    daily: getDailyStats()
  });
});

export default router;
