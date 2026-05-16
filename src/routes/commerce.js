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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${h(title)}</title>
    <style>
      :root {
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
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
        <strong>OpenClaw Delivery</strong>
        <div>
          <a href="/">Home</a>
          <a href="/plans">Plans</a>
          <a href="/orders">Order Lookup</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>
      ${body}
    </main>
  </body>
</html>`;
}

function planCard(plan) {
  return `<article class="card">
    <h2>${h(plan.name)}</h2>
    <p class="muted">${h(plan.description)}</p>
    <div class="price">$${h(plan.price)}</div>
    <p>Our plan: <code>${h(plan.our_plan_code)}</code></p>
    <p>Mapped purchase plan: <code>${h(plan.third_party_plan_code)}</code></p>
    <a class="button" href="/plans/${h(plan.id)}">View plan</a>
  </article>`;
}

function orderSummary(order) {
  const plan = getPlan(order.plan_id);
  return `<div class="panel">
    <h2>Order ${h(order.id)}</h2>
    <p>Contact: <code>${h(order.user_contact)}</code></p>
    <p>Plan: ${h(plan?.name || order.plan_id)}</p>
    <p>Payment: <span class="status">${h(order.pay_status)}</span></p>
    <p>Fulfillment: <span class="status">${h(order.fulfillment_status)}</span></p>
    <p>Delivery code: ${order.delivery_code ? `<code>${h(order.delivery_code)}</code>` : '<span class="muted">not generated yet</span>'}</p>
  </div>`;
}

function requireAdmin(req, res) {
  if (!env.adminToken && env.nodeEnv !== 'production') {
    return true;
  }
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === env.adminToken) {
    return true;
  }
  res.status(401).type('html').send(page('Admin Locked', `
    <h1>Admin Locked</h1>
    <p class="lead">Provide <code>X-Admin-Token</code> or append <code>?token=...</code> using the server-side <code>ADMIN_TOKEN</code>.</p>
  `));
  return false;
}

router.get('/', (req, res) => {
  res.type('html').send(page('OpenClaw Delivery', `
    <h1>API Package Delivery Platform</h1>
    <p class="lead">
      OpenClaw sells our own API access packages, maps each package to a third-party plan,
      simulates purchase fulfillment, encrypts the returned connection code, and shows users
      only a generated delivery code.
    </p>
    <section class="grid">
      <article class="card">
        <h2>Order to Delivery</h2>
        <p>User selects a package, creates an order, completes payment, and receives a public delivery code after fulfillment.</p>
      </article>
      <article class="card">
        <h2>Plan Mapping</h2>
        <p><code>our_plan_id</code> can map to a different <code>third_party_plan_code</code>, so storefront packaging stays independent from supplier purchasing.</p>
      </article>
      <article class="card">
        <h2>Secure Handoff</h2>
        <p>Raw third-party connection codes are encrypted server-side. The user sees only our delivery code.</p>
      </article>
    </section>
    <p><a class="button" href="/plans">Browse plans</a></p>
  `));
});

router.get('/plans', (req, res) => {
  res.type('html').send(page('Plans', `
    <h1>Plans</h1>
    <p class="lead">Choose the package the user buys from our platform. The backend maps it to a supplier purchase plan.</p>
    <section class="grid">${listPlans().map(planCard).join('')}</section>
  `));
});

router.get('/plans/:planId', (req, res) => {
  const plan = getPlan(req.params.planId);
  if (!plan) {
    return res.status(404).type('html').send(page('Plan Not Found', '<h1>Plan not found</h1>'));
  }
  res.type('html').send(page(plan.name, `
    <h1>${h(plan.name)}</h1>
    <p class="lead">${h(plan.description)}</p>
    <div class="panel">
      <p class="price">$${h(plan.price)}</p>
      <p>Storefront code: <code>${h(plan.our_plan_code)}</code></p>
      <p>Supplier mapping: <code>${h(plan.third_party_plan_code)}</code></p>
      <a class="button" href="/checkout/${h(plan.id)}">Start order</a>
    </div>
  `));
});

router.get('/checkout/:planId', (req, res) => {
  const plan = getPlan(req.params.planId);
  if (!plan) {
    return res.status(404).type('html').send(page('Plan Not Found', '<h1>Plan not found</h1>'));
  }
  res.type('html').send(page('Checkout', `
    <h1>Checkout</h1>
    <div class="panel">
      <h2>${h(plan.name)}</h2>
      <p class="price">$${h(plan.price)}</p>
      <form method="post" action="/orders">
        <input type="hidden" name="plan_id" value="${h(plan.id)}" />
        <label>User contact
          <input name="user_contact" required placeholder="email@example.com or Telegram handle" />
        </label>
        <p><button type="submit">Create order</button></p>
      </form>
    </div>
  `));
});

router.post('/orders', (req, res) => {
  const userContact = String(req.body.user_contact || '').trim();
  if (!userContact || !req.body.plan_id) {
    return res.status(400).type('html').send(page('Invalid Order', '<h1>Missing order contact or plan</h1>'));
  }
  const order = createOrder({
    planId: req.body.plan_id,
    userContact
  });
  res.redirect(303, `/orders/${order.id}`);
});

router.get('/orders', (req, res) => {
  res.type('html').send(page('Order Lookup', `
    <h1>Order Lookup</h1>
    <div class="panel">
      <form method="get" action="/orders/find">
        <label>Order ID or delivery code
          <input name="q" required placeholder="ord_... or OC-..." />
        </label>
        <p><button type="submit">Find order</button></p>
      </form>
    </div>
  `));
});

router.get('/orders/find', (req, res) => {
  const query = String(req.query.q || '').trim();
  const delivery = getDeliveryByPublicCode(query);
  if (delivery) {
    return res.redirect(303, `/orders/${delivery.order_id}`);
  }
  const order = getOrder(query);
  if (order) {
    return res.redirect(303, `/orders/${order.id}`);
  }
  return res.status(404).type('html').send(page('Order Not Found', '<h1>Order not found</h1>'));
});

router.get('/orders/:orderId', (req, res) => {
  const order = getOrder(req.params.orderId);
  if (!order) {
    return res.status(404).type('html').send(page('Order Not Found', '<h1>Order not found</h1>'));
  }
  res.type('html').send(page('Order Status', `
    <h1>Order Status</h1>
    ${orderSummary(order)}
    ${order.pay_status === 'pending' ? `
      <form method="post" action="/orders/${h(order.id)}/pay">
        <p><button type="submit">Simulate payment success</button></p>
      </form>
    ` : ''}
    ${order.delivery_code ? `<p><a class="button" href="/delivery/${h(order.delivery_code)}">Open delivery page</a></p>` : ''}
  `));
});

router.post('/orders/:orderId/pay', (req, res) => {
  markOrderPaid(req.params.orderId);
  res.redirect(303, `/orders/${req.params.orderId}`);
});

router.get('/delivery/:publicCode', (req, res) => {
  const delivery = getDeliveryByPublicCode(req.params.publicCode);
  if (!delivery) {
    return res.status(404).type('html').send(page('Delivery Not Found', '<h1>Delivery code not found</h1>'));
  }
  const order = getOrder(delivery.order_id);
  res.type('html').send(page('Delivery', `
    <h1>Delivery Code</h1>
    <div class="panel">
      <p>Your delivery code:</p>
      <p class="price"><code>${h(delivery.public_code)}</code></p>
      <p>Status: <span class="status">${h(delivery.status)}</span></p>
      <p>Order: <code>${h(order.id)}</code></p>
      <p class="muted">The third-party raw connection code is encrypted in storage and is not displayed on this page.</p>
    </div>
  `));
});

router.get('/admin', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const purchases = listPurchases();
  res.type('html').send(page('Admin', `
    <h1>Admin</h1>
    <p class="lead">View orders, purchase tasks, fulfillment status, retry failed purchases, and mark tasks for manual intervention.</p>
    <h2>Orders</h2>
    <table>
      <thead><tr><th>ID</th><th>Contact</th><th>Plan</th><th>Payment</th><th>Fulfillment</th><th>Delivery</th></tr></thead>
      <tbody>${listOrders().map((order) => `<tr>
        <td><a href="/orders/${h(order.id)}">${h(order.id)}</a></td>
        <td>${h(order.user_contact)}</td>
        <td>${h(order.plan_id)}</td>
        <td>${h(order.pay_status)}</td>
        <td>${h(order.fulfillment_status)}</td>
        <td>${h(order.delivery_code || '')}</td>
      </tr>`).join('')}</tbody>
    </table>
    <h2>Purchase Tasks</h2>
    <table>
      <thead><tr><th>ID</th><th>Order</th><th>Supplier Plan</th><th>Status</th><th>Retries</th><th>Manual</th><th>Actions</th></tr></thead>
      <tbody>${purchases.map((purchase) => `<tr>
        <td>${h(purchase.id)}</td>
        <td>${h(purchase.order_id)}</td>
        <td>${h(purchase.third_party_plan_code)}</td>
        <td>${h(purchase.purchase_status)}</td>
        <td>${h(purchase.retry_count)}</td>
        <td>${purchase.manual_intervention_required ? 'yes' : 'no'}</td>
        <td>
          <form class="inline" method="post" action="/admin/purchases/${h(purchase.id)}/retry"><button type="submit">Retry</button></form>
          <form class="inline" method="post" action="/admin/purchases/${h(purchase.id)}/manual"><button type="submit">Manual</button></form>
        </td>
      </tr>`).join('')}</tbody>
    </table>
    <h2>Delivery Codes</h2>
    <table>
      <thead><tr><th>Public Code</th><th>Order</th><th>Status</th><th>Expires</th><th>Encrypted Payload</th></tr></thead>
      <tbody>${listDeliveryCodes().map((delivery) => `<tr>
        <td>${h(delivery.public_code)}</td>
        <td>${h(delivery.order_id)}</td>
        <td>${h(delivery.status)}</td>
        <td>${h(delivery.expires_at)}</td>
        <td><code>${h(delivery.encrypted_payload.slice(0, 32))}...</code></td>
      </tr>`).join('')}</tbody>
    </table>
  `));
});

router.post('/admin/purchases/:purchaseId/retry', (req, res) => {
  if (!requireAdmin(req, res)) return;
  retryPurchase(req.params.purchaseId);
  res.redirect(303, '/admin');
});

router.post('/admin/purchases/:purchaseId/manual', (req, res) => {
  if (!requireAdmin(req, res)) return;
  markPurchaseManual(req.params.purchaseId);
  res.redirect(303, '/admin');
});

export default router;
