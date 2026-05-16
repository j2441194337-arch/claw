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
const brandName = 'tokyo 多模API商店';

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(body, options = {}) {
  const { active = '' } = options;
  const navItems = [
    { label: '首页', href: '/', key: 'home' },
    { label: '套餐购买', href: '/plans', key: 'plans' },
    { label: '异常反馈', href: '/feedback', key: 'feedback' },
    { label: '帮助中心', href: '/help', key: 'help' }
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brandName}</title>
    <style>
      :root {
        font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", system-ui, sans-serif;
        color: #17201f;
        background: #f7f3ea;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 15% 12%, rgba(15, 118, 110, 0.12), transparent 28%),
          radial-gradient(circle at 82% 18%, rgba(183, 121, 31, 0.10), transparent 24%),
          linear-gradient(180deg, #fbf8f1 0%, #f4efe3 100%);
        color: #17201f;
      }
      a {
        color: #0f766e;
        font-weight: 700;
        text-decoration: none;
      }
      .shell {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 24px 0 56px;
      }
      nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        min-height: 56px;
      }
      .brand {
        color: #142320;
        font-size: 19px;
        font-weight: 900;
      }
      .nav-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }
      .nav-links a {
        min-height: 34px;
        padding: 6px 10px;
        border-radius: 999px;
        color: #35423f;
      }
      .nav-links a.active,
      .nav-links a:hover {
        background: rgba(15, 118, 110, 0.10);
        color: #0f766e;
      }
      h1 {
        margin: 0;
        color: #111b19;
        font-size: clamp(42px, 7vw, 76px);
        line-height: 0.98;
        letter-spacing: 0;
      }
      h2 {
        margin: 0 0 12px;
        color: #16201f;
        font-size: 22px;
      }
      h3 {
        margin: 0 0 6px;
        font-size: 18px;
      }
      p, li, label, input, button {
        font-size: 16px;
        line-height: 1.68;
      }
      .lead {
        max-width: 760px;
        margin: 16px auto 0;
        color: #5f6a68;
        font-size: 18px;
      }
      .hero {
        position: relative;
        padding: 76px 0 34px;
        text-align: center;
      }
      .hero::before {
        content: "";
        position: absolute;
        inset: 22px 12% auto;
        height: 120px;
        background:
          linear-gradient(90deg, transparent, rgba(15, 118, 110, 0.10), transparent),
          repeating-linear-gradient(90deg, rgba(15, 118, 110, 0.10) 0 1px, transparent 1px 42px);
        mask-image: linear-gradient(180deg, black, transparent);
        pointer-events: none;
      }
      .search-panel {
        position: relative;
        max-width: 760px;
        margin: 34px auto 0;
      }
      .search-form {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 72px;
        padding: 9px 10px 9px 26px;
        border: 1px solid rgba(15, 118, 110, 0.18);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 24px 60px rgba(34, 50, 45, 0.14);
      }
      .search-form input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: #16201f;
        font-size: 18px;
      }
      .search-form button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 54px;
        width: 54px;
        height: 54px;
        border: 0;
        border-radius: 999px;
        background: #0f766e;
        color: #fff;
        font-size: 24px;
        font-weight: 900;
        cursor: pointer;
      }
      .quick-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 34px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .card, .panel, .quick-card {
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(218, 215, 202, 0.86);
        border-radius: 18px;
        box-shadow: 0 16px 38px rgba(44, 42, 32, 0.08);
      }
      .card, .panel {
        padding: 22px;
      }
      .quick-card {
        display: block;
        min-height: 128px;
        padding: 20px;
        color: inherit;
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .quick-card:hover {
        transform: translateY(-2px);
        border-color: rgba(15, 118, 110, 0.38);
        box-shadow: 0 22px 48px rgba(44, 42, 32, 0.12);
      }
      .quick-card p, .card p {
        margin: 0;
        color: #68726f;
      }
      .price {
        margin: 12px 0 16px;
        color: #0f766e;
        font-size: 34px;
        font-weight: 900;
      }
      .muted {
        color: #68726f;
      }
      .button, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        background: #0f766e;
        color: #ffffff;
        font-weight: 800;
        cursor: pointer;
      }
      .button.secondary {
        background: #263a36;
      }
      input {
        width: 100%;
        min-height: 44px;
        padding: 8px 12px;
        border: 1px solid #c9c6ba;
        border-radius: 12px;
        background: #ffffff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: #ffffff;
        border: 1px solid #dad7ca;
        border-radius: 12px;
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
      .advantage-bar {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 28px;
        padding: 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.62);
        border: 1px solid rgba(218, 215, 202, 0.8);
      }
      .advantage-bar strong {
        display: block;
        margin-bottom: 4px;
        color: #0f3d38;
      }
      form.inline {
        display: inline;
      }
      @media (max-width: 860px) {
        .quick-grid,
        .advantage-bar {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .shell {
          width: min(100% - 28px, 1120px);
          padding-top: 18px;
        }
        nav {
          align-items: flex-start;
          flex-direction: column;
        }
        .nav-links {
          justify-content: flex-start;
        }
        .hero {
          padding-top: 52px;
        }
        .search-form {
          min-height: 62px;
          padding-left: 18px;
        }
        .search-form button {
          flex-basis: 46px;
          width: 46px;
          height: 46px;
        }
        .quick-grid,
        .advantage-bar {
          grid-template-columns: 1fr;
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
        <a class="brand" href="/">${brandName}</a>
        <div class="nav-links">
          ${navItems.map((item) => `<a class="${active === item.key ? 'active' : ''}" href="${item.href}">${item.label}</a>`).join('')}
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
      name: '入门套餐',
      audience: '适合个人与初创开发者',
      benefits: ['基础 API 套餐购买', '支付后生成交付码', '支持订单查询与补发协助'],
      delivery: '适合首次购买和轻量使用，付款后可在订单页查看交付结果。'
    },
    growth: {
      name: '进阶套餐',
      audience: '适合需要提升调用配额与能力的团队',
      benefits: ['更高额度支持', '交付码自动生成', '异常情况可提交反馈'],
      delivery: '适合稳定使用和团队测试，付款后进入标准交付流程。'
    },
    business: {
      name: '商务套餐',
      audience: '适合企业级方案与专属服务需求',
      benefits: ['商务级套餐服务', '优先人工协助', '订单记录可查询'],
      delivery: '适合长期项目和企业客户，必要时可联系人工协助处理。'
    }
  };

  return content[plan.id] || {
    name: plan.name,
    audience: '适合需要购买 AI API 套餐的用户',
    benefits: ['在线下单', '订单查询', '人工协助'],
    delivery: '付款后可查看订单状态和交付结果。'
  };
}

function planCard(plan) {
  const display = storefrontPlan(plan);
  return `<article class="card">
    <h2>${h(display.name)}</h2>
    <p class="muted">${h(display.audience)}</p>
    <div class="price">¥${h(plan.price)}</div>
    <h3>套餐权益</h3>
    <ul>${display.benefits.map((item) => `<li>${h(item)}</li>`).join('')}</ul>
    <h3>交付说明</h3>
    <p class="muted">${h(display.delivery)}</p>
    <p><a class="button" href="/plans/${h(plan.id)}">查看并购买</a></p>
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
    purchasing: '处理中',
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
  res.status(401).type('html').send(page(`
    <h1>后台已锁定</h1>
    <p class="lead">请通过 <code>X-Admin-Token</code> 请求头，或追加 <code>?token=...</code> 使用服务端配置的 <code>ADMIN_TOKEN</code> 访问。</p>
  `));
  return false;
}

function staticInfoPage({ active, title, lead, cards }) {
  return page(`
    <section class="hero" style="padding-bottom: 18px;">
      <h1>${h(title)}</h1>
      <p class="lead">${h(lead)}</p>
    </section>
    <section class="grid">
      ${cards.map((card) => `<article class="card">
        <h2>${h(card.title)}</h2>
        <p>${h(card.body)}</p>
      </article>`).join('')}
    </section>
  `, { active });
}

router.get('/', (req, res) => {
  res.type('html').send(page(`
    <section class="hero">
      <h1>${brandName}</h1>
      <p class="lead">快速选择并购买 AI 套餐，提交异常情况反馈，获得专业支持。</p>
      <div class="search-panel">
        <form class="search-form" id="home-search">
          <input id="home-search-input" name="q" autocomplete="off" placeholder="搜索套餐、使用问题或提交需求" />
          <button type="submit" aria-label="搜索">→</button>
        </form>
      </div>
      <section class="quick-grid" aria-label="主要入口">
        <a class="quick-card" href="/plans"><h3>购买入门套餐</h3><p>适合个人与初创开发者</p></a>
        <a class="quick-card" href="/plans"><h3>购买进阶套餐</h3><p>提升调用配额与能力</p></a>
        <a class="quick-card" href="/plans"><h3>购买商务套餐</h3><p>企业级方案与专属服务</p></a>
        <a class="quick-card" href="/feedback"><h3>异常情况反馈</h3><p>提交问题，快速响应处理</p></a>
        <a class="quick-card" href="/help"><h3>人工协助</h3><p>联系客服获得帮助</p></a>
        <a class="quick-card" href="/faq"><h3>常见问题</h3><p>查看使用指南与解答</p></a>
      </section>
      <section class="advantage-bar" aria-label="服务优势">
        <p><strong>安全可靠</strong>多重防护，保障数据安全</p>
        <p><strong>快速稳定</strong>全球加速，高可用架构</p>
        <p><strong>灵活多模</strong>文本、图像、语音、更多</p>
        <p><strong>专业支持</strong>7×24 小时贴心服务</p>
      </section>
    </section>
    <script>
      document.getElementById('home-search').addEventListener('submit', function (event) {
        event.preventDefault();
        var value = document.getElementById('home-search-input').value.trim().toLowerCase();
        if (!value) {
          window.location.href = '/plans';
          return;
        }
        if (/套餐|购买|入门|进阶|商务/.test(value)) {
          window.location.href = '/plans';
          return;
        }
        if (/反馈|异常|问题/.test(value)) {
          window.location.href = '/feedback';
          return;
        }
        if (/帮助|客服|人工|faq|常见问题/i.test(value)) {
          window.location.href = '/help';
          return;
        }
        window.location.href = '/plans';
      });
    </script>
  `, { active: 'home' }));
});

router.get('/feedback', (req, res) => {
  res.type('html').send(staticInfoPage({
    active: 'feedback',
    title: '异常反馈',
    lead: '如果订单、套餐或交付码遇到异常，请整理信息后提交给客服，我们会尽快处理。',
    cards: [
      { title: '需要提供的信息', body: '请准备订单号、交付码、联系方式和问题描述，方便快速定位。' },
      { title: '适用场景', body: '支付后未看到结果、订单无法查询、交付码无法使用、套餐选择错误等。' },
      { title: '处理方式', body: '系统会保留订单记录，客服可根据订单状态进行补发、核对或进一步协助。' }
    ]
  }));
});

router.get('/help', (req, res) => {
  res.type('html').send(staticInfoPage({
    active: 'help',
    title: '帮助中心',
    lead: '这里提供套餐购买、订单查询、交付码保存和人工协助的基础说明。',
    cards: [
      { title: '如何购买', body: '进入套餐购买页面，选择适合的套餐，填写联系方式并提交订单。' },
      { title: '如何查询订单', body: '进入订单查询页面，输入订单号或交付码即可查看当前状态。' },
      { title: '人工协助', body: '遇到异常时，请通过异常反馈入口提交信息，客服会协助处理。' }
    ]
  }));
});

router.get('/faq', (req, res) => {
  res.type('html').send(staticInfoPage({
    active: 'help',
    title: '常见问题',
    lead: '以下是购买和使用过程中最常见的问题说明。',
    cards: [
      { title: '付款后在哪里看结果？', body: '付款成功后返回订单页面，系统会显示订单状态和交付码。' },
      { title: '交付码丢失怎么办？', body: '可通过订单查询找回，或联系管理员协助补发。' },
      { title: '遇到异常如何处理？', body: '进入异常反馈页面，提交订单号、联系方式和问题描述。' }
    ]
  }));
});

router.get('/plans', async (req, res, next) => {
  try {
    const plans = await listPlans();
    res.type('html').send(page(`
      <section class="hero" style="padding-bottom: 18px;">
        <h1>选择适合你的 AI 套餐</h1>
        <p class="lead">所有套餐支持在线下单、订单查询和交付码查看。请选择适合当前使用场景的套餐。</p>
      </section>
      <section class="grid">${plans.map(planCard).join('')}</section>
    `, { active: 'plans' }));
  } catch (error) {
    next(error);
  }
});

router.get('/plans/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId);
    if (!plan) {
      return res.status(404).type('html').send(page('<h1>套餐不存在</h1>', { active: 'plans' }));
    }
    const display = storefrontPlan(plan);
    res.type('html').send(page(`
      <section class="hero" style="padding-bottom: 18px;">
        <h1>${h(display.name)}</h1>
        <p class="lead">${h(display.audience)}</p>
      </section>
      <div class="panel">
        <p class="price">¥${h(plan.price)}</p>
        <h2>套餐权益</h2>
        <ul>${display.benefits.map((item) => `<li>${h(item)}</li>`).join('')}</ul>
        <h2>交付说明</h2>
        <p>${h(display.delivery)}</p>
        <p><a class="button" href="/checkout/${h(plan.id)}">购买此套餐</a></p>
      </div>
    `, { active: 'plans' }));
  } catch (error) {
    next(error);
  }
});

router.get('/checkout/:planId', async (req, res, next) => {
  try {
    const plan = await getPlan(req.params.planId);
    if (!plan) {
      return res.status(404).type('html').send(page('<h1>套餐不存在</h1>', { active: 'plans' }));
    }
    const display = storefrontPlan(plan);
    res.type('html').send(page(`
      <section class="hero" style="padding-bottom: 18px;">
        <h1>确认订单</h1>
        <p class="lead">请确认套餐并填写联系方式，用于订单查询和必要时的人工协助。</p>
      </section>
      <div class="panel">
        <h2>${h(display.name)}</h2>
        <p class="price">¥${h(plan.price)}</p>
        <form method="post" action="/orders">
          <input type="hidden" name="plan_id" value="${h(plan.id)}" />
          <label>联系方式
            <input name="user_contact" required placeholder="请输入邮箱、微信或 Telegram 联系方式" />
          </label>
          <p><button type="submit">提交订单</button></p>
        </form>
      </div>
    `, { active: 'plans' }));
  } catch (error) {
    next(error);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    const userContact = String(req.body.user_contact || '').trim();
    if (!userContact || !req.body.plan_id) {
      return res.status(400).type('html').send(page('<h1>请填写联系方式并选择套餐</h1>'));
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
  res.type('html').send(page(`
    <section class="hero" style="padding-bottom: 18px;">
      <h1>订单查询</h1>
      <p class="lead">输入订单号或交付码，查看当前订单状态。</p>
    </section>
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
    return res.status(404).type('html').send(page('<h1>未找到订单</h1>'));
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const order = await getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).type('html').send(page('<h1>未找到订单</h1>'));
    }
    res.type('html').send(page(`
      <section class="hero" style="padding-bottom: 18px;">
        <h1>订单状态</h1>
        <p class="lead">你可以在这里查看支付状态、交付状态和交付码。</p>
      </section>
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
      return res.status(404).type('html').send(page('<h1>交付码不存在</h1>'));
    }
    const order = await getOrder(delivery.order_id);
    res.type('html').send(page(`
      <section class="hero" style="padding-bottom: 18px;">
        <h1>交付码</h1>
        <p class="lead">请妥善保存此交付码，后续可通过订单查询或联系管理员补发。</p>
      </section>
      <div class="panel">
        <p>你的交付码：</p>
        <p class="price"><code>${h(delivery.public_code)}</code></p>
        <p>状态：<span class="status">${h(statusText(delivery.status))}</span></p>
        <p>订单号：<code>${h(order.id)}</code></p>
        <ul>
          <li>请妥善保存此交付码。</li>
          <li>后续可通过订单查询或联系管理员补发。</li>
          <li>连接资料由系统安全保管，不会直接公开展示。</li>
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
    const [orders, purchases, deliveryCodes, plans] = await Promise.all([
      listOrders(),
      listPurchases(),
      listDeliveryCodes(),
      listPlans()
    ]);
    res.type('html').send(page(`
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
          <td>¥${h(plan.price)}</td>
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
