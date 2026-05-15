import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { fetchUpstream } from '../services/provider.js';

const router = Router();

function sendProxyError(res, error) {
  return res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'Internal proxy error',
      code: error.code || 'proxy_error'
    }
  });
}

async function sendUpstreamResponse(res, upstreamResponse) {
  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) {
    res.set('content-type', contentType);
  }

  const bodyText = await upstreamResponse.text();
  return res.status(upstreamResponse.status).send(bodyText);
}

router.get('/models', authMiddleware, async (req, res) => {
  try {
    const upstreamResponse = await fetchUpstream('/models', {
      method: 'GET'
    });
    return sendUpstreamResponse(res, upstreamResponse);
  } catch (error) {
    return sendProxyError(res, error);
  }
});

router.post('/chat/completions', authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.model) {
      return res.status(400).json({
        error: {
          message: 'Missing model',
          code: 'missing_model'
        }
      });
    }

    const upstreamResponse = await fetchUpstream('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return sendUpstreamResponse(res, upstreamResponse);
  } catch (error) {
    return sendProxyError(res, error);
  }
});

router.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'OpenAI-compatible endpoint not found',
      code: 'not_found'
    }
  });
});

export default router;
