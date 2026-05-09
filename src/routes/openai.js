import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { estimateCharge, debitUser } from '../services/billing.js';
import { buildProviderRequest, resolveProviderByModel } from '../services/provider.js';
import { logRequest } from '../services/logging.js';

const router = Router();

async function proxyRequest(req, res, endpointType) {
  try {
    const payload = req.body || {};
    const providerName = payload.provider || resolveProviderByModel(payload.model);
    const charge = estimateCharge(endpointType, payload);

    const requestMeta = buildProviderRequest(providerName, endpointType, payload);
    const upstreamResponse = await fetch(requestMeta.url, requestMeta.options);
    const rawText = await upstreamResponse.text();
    let responseBody;
    try {
      responseBody = JSON.parse(rawText);
    } catch {
      responseBody = { raw: rawText };
    }

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        error: {
          message: 'Upstream provider error',
          provider: providerName,
          details: responseBody
        }
      });
    }

    const usageRecord = {
      id: `usage_${Date.now()}`,
      userId: req.user.id,
      endpointType,
      provider: providerName,
      model: payload.model || 'unknown',
      charge,
      timestamp: new Date().toISOString()
    };

    const updatedUser = debitUser(req.user.id, charge, usageRecord);
    logRequest({
      ...usageRecord,
      remainingBalance: updatedUser.balance,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    return res.json({
      ...responseBody,
      proxy_meta: {
        provider: providerName,
        charged: charge,
        remaining_balance: updatedUser.balance
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        message: error.message || 'Internal proxy error'
      }
    });
  }
}

router.post('/chat/completions', authMiddleware, async (req, res) => proxyRequest(req, res, 'chat'));
router.post('/embeddings', authMiddleware, async (req, res) => proxyRequest(req, res, 'embeddings'));
router.get('/models', authMiddleware, async (req, res) => {
  return res.json({
    object: 'list',
    data: [
      { id: 'gpt-4.1-mini', provider: 'openai' },
      { id: 'gpt-4o-mini', provider: 'openai' },
      { id: 'claude-sonnet', provider: 'anthropic' },
      { id: 'gemini-2.5-flash', provider: 'google' },
      { id: 'deepseek-chat', provider: 'domestic' }
    ]
  });
});

export default router;
