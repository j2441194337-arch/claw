import { Router } from 'express';
import { config, env } from '../utils/env.js';
import { hasUpstreamConfig } from '../services/provider.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: config.service?.name || 'openclaw' });
});

router.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: config.service?.name || 'openclaw'
  });
});

router.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stage: config.service?.stage || 'production-ready',
    upstreamConfigured: hasUpstreamConfig(),
    platformKeysConfigured: env.apiKeys.length > 0
  });
});

export default router;
