import { Router } from 'express';
import { env } from '../utils/env.js';
import {
  createOrder,
  getDeliveryByPublicCode,
  getOrder,
  getPlan,
  listDeliveryCodes,
  listOrders,
  listPlans,
  listPurchases,
  markOrderPaid,
  markPurchaseManual,
  retryPurchase
} from '../services/store.js';

const router = Router();

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(title, body) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${h(title)}</title>
    <style>
      :root {
        font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", system-ui, sans-serif;
        color: #18212f;
        background: #f7f6f1;
      }
      body {
        margin: 0;
        background: #f7f6f1;
      }
      a {
        color: #0f766e;
        font-weight: 700;
      }
      .shell {
        max-width: 1120px;
        margin: 0 auto;
        padding: 28px 20px 56px;
      }
      nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 22px;
        border-bottom: 1px solid #dad7ca;
      }
      nav div {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }
      h1 {
        margin: 34px 0 14px;
        font-size: clamp(36px, 7vw, 72px);
        line-height: 0.95;
        letter-spacing: 0;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 22px;
      }
      p, li, label, input, button {
        font-size: 16px;
        line-height: 1.65;
      }
      .lead {
        max-width: 760px;
        color: #586170;
        font-size: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .card, .panel {
        background: #ffffff;
        border: 1px solid #dad7ca;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 14px 34px rgba(44, 42, 32, 0.07);
      }
      .price {
        font-size: 32px;
        font-weight: 800;
        margin: 10px 0;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: #ffefc2;
        color: #604200;
        font-weight: 800;
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }
      .secondary {
        background: #263238;
      }
      .muted {
        color: #687383;
      }
      .button, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 14px;
        border: 0;
        border-radius: 8px;
        background: #0f766e;
        color: #ffffff;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }
      input {
        box-sizing: border-box;
        width: 100%;
        min-height: 42px;
        padding: 8px 10px;
        border: 1px solid #c9c6ba;
        border-radius: 8px;
        background: #ffffff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: #ffffff;
        border: 1px solid #dad7ca;
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        padding: 10px;
        border-bottom: 1px solid #ece9df;
        text-align: left;
        vertical-align: top;
      }
      code {
        font-family: "SFMono-Regular", Consolas, monospace;
        background: #eef1e8;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 9px;
        border-radius: 999px;
        background: #ffefc2;
        color: #604200;
        font-weight: 800;
      }
      form.inline {
        display: inline;
      }
      @media (max-width: 720px) {
        nav {
          align-items: flex-start;
          flex-direction: column;
        }
        table {
          display: block;
          overflow-x: auto;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <nav>
        <strong>OpenClaw 自动交付</strong>
        <div>
          <a href="/">首页</a>
          <a href="/plans">套餐</a>
          <a href="/orders">订单查询</a>
          <a href="/admin">后台</a>
        </div>
      </nav>
      ${body}
    </main>
  </body>
</html>`;
}

function storefrontPlan(plan) {
  const content = {
    starter: {
      name: '入门体验套餐',
      audience: '适合个人用户、轻量测试和首次体验 AI API 套餐交付。',
      benefits: ['基础 API 连接服务', '支付后自动生成交付码', '支持订单查询与补发协助'],
      delivery: '付款成功后系统自动处理，生成交付码后即可在订单页查看。'
    },
    growth: {
      name: '进阶使用套餐',
      audience: '适合稳定使用、团队测试和中小项目接入。',
      benefits: ['更高使用额度支持', '自动采购与交付码生成', '支持人工补发和异常处理'],
      delivery: '付款后自动进入采购流程，完成后交付码会绑定到订单。'
    },
    business: {
      name: '商务保障套餐',
      audience: '适合长期使用、业务项目和需要优先处理的客户。',
      benefits: ['商务级套餐交付', '异常订单人工优先处理', '交付记录可追踪可查询'],
      delivery: '系统自动处理采购和交付，必要时后台会标记人工介入。'
    }
  };

  return content[plan.id] || {
    name: plan.name,
    audience: '适合需要购买 AI API 套餐并快速获取交付码的用户。',
    benefits: ['自动下单处理', '交付码查询', '异常人工处理'],
    delivery: '付款成功后生成交付码。'
  };
}

function planCard(plan) {
  const display = storefrontPlan(plan);
  return `<article class="card">
    <h2>${h(display.name)}</h2>
    <p class="muted">${h(display.audience)}</p>
    <div class="price">$${h(plan.price)}</div>
    <h2>套餐权益</h2>
    <ul>${display.benefits.map((item) => `<li>${h(item)}</li>`).join('')}</ul>
    <p class="muted">${h(display.delivery)}</p>
    <a class="button" href="/plans/${h(plan.id)}">查看并购买</a>
  </article>`;
}

async function orderSummary(order) {
  const plan = await getPlan(order.plan_id);
  const display = plan ? storefrontPlan(plan) : null;
  return `<div class="panel">
    <h2>订单 ${h(order.id)}</h2>
    <p>联系方式：<code>${h(order.user_contact)}</code></p>
    <p>购买套餐：${h(display?.name || order.plan_id)}</p>
    <p>支付状态：<span class="status">${h(statusText(order.pay_status))}</span></p>
    <p>交付状态：<span class="status">${h(statusText(order.fulfillment_status))}</span></p>
    <p>交付码：${order.delivery_code ? `<code>${h(order.delivery_code)}</code>` : '<span class="muted">暂未生成</span>'}</p>
  </div>`;
}

function statusText(status) {
  const labels = {
    pending: '待支付',
    paid: '已支付',
    waiting_payment: '等待支付',
    purchasing: '采购中',
    fulfilled: '已交付',
    queued: '排队中',
    success: '成功',
    failed: '失败',
    retrying: '重试中',
    manual_review: '人工处理',
    active: '可用'
  };
  return labels[status] || status;
}

function requireAdmin(req, res) {
  if (!env.adminToken && env.nodeEnv !== 'production') {
    return true;
  }
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === env.adminToken) {
    return true;
  }
  res.status(401).type('html').send(page('后台已锁定', `
    <h1>后台已锁定</h1>
    <p class="lead">请通过 <code>X-Admin-Token</code> 请求头，或追加 <code>?token=...</code> 使用服务端配置的 <code>ADMIN_TOKEN</code> 访问。</p>
  `));
  return false;
}

router.get('/', (req, res) => {
  res.type('html').send(page('AI 套餐自动交付平台', `
    <span class="eyebrow">AI API 套餐购买与交付</span>
    <h1>AI 套餐自动交付平台</h1>
    <p class="lead">
      选择套餐并完成支付后，系统会自动处理采购和交付，生成专属交付码。
      你可以随时通过订单查询查看交付状态；原始连接信息会加密保存，不直接公开展示。
    </p>
    <div class="hero-actions">
      <a class="button" href="/plans">立即选择套餐</a>
      <a class="button secondary" href="/orders">查询订单</a>
    </div>
    <section class="grid">
      <article class="card">
        <h2>支付后自动交付</h2>
        <p>用户下单并完成支付后，系统自动创建采购任务并生成交付码。</p>
      </article>
      <article class="card">
        <h2>订单可查询</h2>
        <p>可通过订单号或交付码查询状态，便于后续保存、补发和售后处理。</p>
      </article>
      <article class="card">
        <h2>交付码安全保存</h2>
        <p>原始连接信息加密保存，前台只展示平台生成的交付码。</p>
      </article>
      <article class="card">
        <h2>支持人工处理</h2>
        <p>采购异常可进入人工介入流程，支持补发、重试和订单跟进。</p>
      </article>
    </section>
  `));
});

router.get('/plans', async (req, res, next) => {
  try {
    const plans = await listPlans();
    res.type('html').send(page('套餐列表', `
      <h1>选择适合你的 AI 套餐</h1>
      <p class="lead">所有套餐支持在线下单、模拟支付、自动生成交付码和订单查询。前台展示购买权益，后台保留采购和交付记录。</p>
      <section class="grid">${plans.map(planCard).join('')}</section>
    `));
  } catch (error) {
    next(error);
  }
});

router.get('/plans/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId);
    if (!plan) {
      return res.status(404).type('html').send(page('套餐不存在', '<h1>套餐不存在</h1>'));
    }
    const display = storefrontPlan(plan);
    res.type('html').send(page(display.name, `
      <h1>${h(display.name)}</h1>
      <p class="lead">${h(display.audience)}</p>
      <div class="panel">
        <p class="price">$${h(plan.price)}</p>
        <h2>套餐权益</h2>
        <ul>${display.benefits.map((item) => `<li>${h(item)}</li>`).join('')}</ul>
        <h2>交付说明</h2>
        <p>${h(display.delivery)}</p>
        <a class="button" href="/checkout/${h(plan.id)}">购买此套餐</a>
      </div>
    `));
  } catch (error) {
    next(error);
  }
});

router.get('/checkout/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId);
    if (!plan) {
      return res.status(404).type('html').send(page('套餐不存在', '<h1>套餐不存在</h1>'));
    }
    const display = storefrontPlan(plan);
    res.type('html').send(page('确认订单', `
      <h1>确认订单</h1>
      <div class="panel">
        <h2>${h(display.name)}</h2>
        <p class="price">$${h(plan.price)}</p>
        <form method="post" action="/orders">
          <input type="hidden" name="plan_id" value="${h(plan.id)}" />
          <label>联系方式
            <input name="user_contact" required placeholder="请输入邮箱、微信或 Telegram 联系方式" />
          </label>
          <p class="muted">用于订单查询、异常处理和必要时人工补发交付码。</p>
          <p><button type="submit">提交订单</button></p>
        </form>
      </div>
    `));
  } catch (error) {
    next(error);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    const userContact = String(req.body.user_contact || '').trim();
    if (!userContact || !req.body.plan_id) {
      return res.status(400).type('html').send(page('订单信息不完整', '<h1>请填写联系方式并选择套餐</h1>'));
    }
    const order = await createOrder({
      planId: req.body.plan_id,
      userContact
    });
    res.redirect(303, `/orders/${order.id}`);
  } catch (error) {
    next(error);
  }
});

router.get('/orders', (req, res) => {
  res.type('html').send(page('订单查询', `
    <h1>订单查询</h1>
    <div class="panel">
      <form method="get" action="/orders/find">
        <label>订单号或交付码
          <input name="q" required placeholder="请输入订单号或 OC- 开头的交付码" />
        </label>
        <p><button type="submit">查询订单</button></p>
      </form>
    </div>
  `));
});

router.get('/orders/find', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    const delivery = await getDeliveryByPublicCode(query);
    if (delivery) {
      return res.redirect(303, `/orders/${delivery.order_id}`);
    }
    const order = await getOrder(query);
    if (order) {
      return res.redirect(303, `/orders/${order.id}`);
    }
    return res.status(404).type('html').send(page('未找到订单', '<h1>未找到订单</h1>'));
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const order = await getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).type('html').send(page('未找到订单', '<h1>未找到订单</h1>'));
    }
    res.type('html').send(page('订单状态', `
      <h1>订单状态</h1>
      ${await orderSummary(order)}
      ${order.pay_status === 'pending' ? `
        <form method="post" action="/orders/${h(order.id)}/pay">
          <p><button type="submit">模拟支付成功</button></p>
        </form>
      ` : ''}
      ${order.delivery_code ? `<p><a class="button" href="/delivery/${h(order.delivery_code)}">查看交付码</a></p>` : ''}
    `));
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:orderId/pay', async (req, res, next) => {
  try {
    await markOrderPaid(req.params.orderId);
    res.redirect(303, `/orders/${req.params.orderId}`);
  } catch (error) {
    next(error);
  }
});

router.get('/delivery/:publicCode', async (req, res, next) => {
  try {
    const delivery = await getDeliveryByPublicCode(req.params.publicCode);
    if (!delivery) {
      return res.status(404).type('html').send(page('交付码不存在', '<h1>交付码不存在</h1>'));
    }
    const order = await getOrder(delivery.order_id);
    res.type('html').send(page('交付码', `
      <h1>交付码</h1>
      <div class="panel">
        <p>请妥善保存此交付码：</p>
        <p class="price"><code>${h(delivery.public_code)}</code></p>
        <p>状态：<span class="status">${h(statusText(delivery.status))}</span></p>
        <p>订单号：<code>${h(order.id)}</code></p>
        <ul>
          <li>请妥善保存此交付码。</li>
          <li>后续可通过订单查询或联系管理员补发。</li>
          <li>原始连接信息已加密保存，不会直接公开展示。</li>
        </ul>
      </div>
    `));
  } catch (error) {
    next(error);
  }
});

router.get('/admin', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [orders, purchases, deliveryCodes] = await Promise.all([
      listOrders(),
      listPurchases(),
      listDeliveryCodes()
    ]);
    const plans = await listPlans();
    res.type('html').send(page('后台管理', `
    <h1>后台管理</h1>
    <p class="lead">查看订单、采购任务、交付状态；支持失败重试和人工介入标记。内部套餐映射仅在后台显示。</p>
    <h2>套餐映射</h2>
    <table>
      <thead><tr><th>plan_id</th><th>套餐名称</th><th>our_plan_code</th><th>third_party_plan_code</th><th>价格</th></tr></thead>
      <tbody>${plans.map((plan) => `<tr>
        <td>${h(plan.id)}</td>
        <td>${h(plan.name)}</td>
        <td><code>${h(plan.our_plan_code)}</code></td>
        <td><code>${h(plan.third_party_plan_code)}</code></td>
        <td>$${h(plan.price)}</td>
      </tr>`).join('')}</tbody>
    </table>
    <h2>订单</h2>
    <table>
      <thead><tr><th>order_id</th><th>联系方式</th><th>plan_id</th><th>支付状态</th><th>交付状态</th><th>交付码</th></tr></thead>
      <tbody>${orders.map((order) => `<tr>
        <td><a href="/orders/${h(order.id)}">${h(order.id)}</a></td>
        <td>${h(order.user_contact)}</td>
        <td>${h(order.plan_id)}</td>
        <td>${h(order.pay_status)}</td>
        <td>${h(order.fulfillment_status)}</td>
        <td>${h(order.delivery_code || '')}</td>
      </tr>`).join('')}</tbody>
    </table>
    <h2>采购任务</h2>
    <table>
      <thead><tr><th>purchase_id</th><th>order_id</th><th>third_party_plan_code</th><th>purchase status</th><th>重试次数</th><th>manual</th><th>操作</th></tr></thead>
      <tbody>${purchases.map((purchase) => `<tr>
        <td>${h(purchase.id)}</td>
        <td>${h(purchase.order_id)}</td>
        <td>${h(purchase.third_party_plan_code)}</td>
        <td>${h(purchase.purchase_status)}</td>
        <td>${h(purchase.retry_count)}</td>
        <td>${purchase.manual_intervention_required ? 'yes' : 'no'}</td>
        <td>
          <form class="inline" method="post" action="/admin/purchases/${h(purchase.id)}/retry"><button type="submit">重试</button></form>
          <form class="inline" method="post" action="/admin/purchases/${h(purchase.id)}/manual"><button type="submit">人工</button></form>
        </td>
      </tr>`).join('')}</tbody>
    </table>
    <h2>交付码</h2>
    <table>
      <thead><tr><th>public_code</th><th>order_id</th><th>delivery status</th><th>过期时间</th><th>encrypted_payload</th></tr></thead>
      <tbody>${deliveryCodes.map((delivery) => `<tr>
        <td>${h(delivery.public_code)}</td>
        <td>${h(delivery.order_id)}</td>
        <td>${h(delivery.status)}</td>
        <td>${h(delivery.expires_at)}</td>
        <td><code>${h(delivery.encrypted_payload.slice(0, 32))}...</code></td>
      </tr>`).join('')}</tbody>
    </table>
  `));
  } catch (error) {
    next(error);
  }
});

router.post('/admin/purchases/:purchaseId/retry', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await retryPurchase(req.params.purchaseId);
    res.redirect(303, '/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/purchases/:purchaseId/manual', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await markPurchaseManual(req.params.purchaseId);
    res.redirect(303, '/admin');
  } catch (error) {
    next(error);
  }
});

export default router;
