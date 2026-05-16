import { Router } from 'express';
import { config, env } from '../utils/env.js';
import {
  isDatabaseConfigured,
  listOrders,
  listPlans,
  listPurchases,
  storageMode
} from '../services/store.js';

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

router.get('/api/status', async (req, res, next) => {
  try {
    const [plans, orders, purchases] = await Promise.all([
      listPlans(),
      listOrders(),
      listPurchases()
    ]);
    res.json({
      ok: true,
      stage: config.service?.stage || 'stage-1-mvp',
      mode: 'orders-payments-fulfillment',
      storageMode: storageMode(),
      databaseConfigured: isDatabaseConfigured(),
      deliveryEncryptionConfigured: Boolean(env.deliveryEncryptionKey),
      adminTokenConfigured: Boolean(env.adminToken),
      totals: {
        plans: plans.length,
        orders: orders.length,
        purchases: purchases.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
