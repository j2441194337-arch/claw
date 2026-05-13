import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { estimateCharge, debitUser } from '../services/billing.js';
import {
  buildProviderRequest,
  fetchThirdPartyModels,
  resolveProviderByModel
} from '../services/provider.js';
import { logRequest } from '../services/logging.js';
import { env } from '../utils/env.js';

const router = Router();

function isModelAllowed(model) {
  if (!env.allowedModels.length) {
    return true;
  }
  return env.allowedModels.includes(model);
}

async function proxyRequest(req, res, endpointType) {
  try {
    const payload = { ...(req.body || {}) };
    if (endpointType === 'chat' && !payload.model) {
      payload.model = env.defaultModel;
    }

    if (!payload.model) {
      return res.status(400).json({
        error: {
          message: 'Missing model',
          code: 'missing_model'
        }
      });
    }

    if (!isModelAllowed(payload.model)) {
      return res.status(400).json({
        error: {
          message: `model_not_allowed: ${payload.model}`,
          code: 'model_not_allowed'
        }
      });
    }

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
  try {
    if (env.allowedModels.length) {
      return res.json({
        object: 'list',
        data: env.allowedModels.map((model) => ({
          id: model,
          object: 'model',
          owned_by: 'openclaw'
        }))
      });
    }

    if (env.provider === 'third_party') {
      const upstreamModels = await fetchThirdPartyModels();
      return res.json(upstreamModels);
    }

    return res.json({
      object: 'list',
      data: [
        { id: 'gpt-4.1-mini', object: 'model', owned_by: 'openclaw' },
        { id: 'gpt-4o-mini', object: 'model', owned_by: 'openclaw' },
        { id: 'claude-sonnet', object: 'model', owned_by: 'openclaw' },
        { id: 'gemini-2.5-flash', object: 'model', owned_by: 'openclaw' },
        { id: 'deepseek-chat', object: 'model', owned_by: 'openclaw' }
      ]
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        message: error.message || 'Failed to load models'
      }
    });
  }
});

export default router;
