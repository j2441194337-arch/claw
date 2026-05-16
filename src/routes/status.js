import { Router } from 'express';
import { config, env } from '../utils/env.js';
import { listOrders, listPlans, listPurchases } from '../services/store.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: config.service?.name || 'openclaw-delivery' });
});

router.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: config.service?.name || 'openclaw-delivery'
  });
});

router.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stage: config.service?.stage || 'stage-1-mvp',
    mode: 'orders-payments-fulfillment',
    deliveryEncryptionConfigured: Boolean(env.deliveryEncryptionKey),
    adminTokenConfigured: Boolean(env.adminToken),
    totals: {
      plans: listPlans().length,
      orders: listOrders().length,
      purchases: listPurchases().length
    }
  });
});

export default router;
