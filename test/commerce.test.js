import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, beforeEach, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DELIVERY_ENCRYPTION_KEY = 'test-delivery-encryption-key';
process.env.ADMIN_TOKEN = 'admin-test-token';

const { default: app } = await import('../src/app.js');
const { resetStoreForTests, listOrders, listPurchases, listDeliveryCodes } = await import('../src/services/store.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await resetStoreForTests();
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health and status expose delivery platform state', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'openclaw-delivery');

  const status = await fetch(`${baseUrl}/api/status`);
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.mode, 'orders-payments-fulfillment');
  assert.equal(body.totals.plans, 3);
});

test('plan and checkout pages are reachable', async () => {
  const plans = await fetch(`${baseUrl}/plans`);
  assert.equal(plans.status, 200);
  assert.match(await plans.text(), /Mapped purchase plan/);

  const checkout = await fetch(`${baseUrl}/checkout/starter`);
  assert.equal(checkout.status, 200);
  assert.match(await checkout.text(), /Create order/);
});

test('order payment creates mapped purchase and delivery code without raw exposure', async () => {
  const createResponse = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      plan_id: 'starter',
      user_contact: 'buyer@example.com'
    }),
    redirect: 'manual'
  });
  assert.equal(createResponse.status, 303);
  const orderPath = createResponse.headers.get('location');
  assert.match(orderPath, /^\/orders\/ord_/);

  const orderId = orderPath.split('/').pop();
  const payResponse = await fetch(`${baseUrl}/orders/${orderId}/pay`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(payResponse.status, 303);

  const orders = await listOrders();
  const purchases = await listPurchases();
  const deliveries = await listDeliveryCodes();

  assert.equal(orders.length, 1);
  assert.equal(orders[0].pay_status, 'paid');
  assert.equal(orders[0].fulfillment_status, 'fulfilled');
  assert.match(orders[0].delivery_code, /^OC-/);

  assert.equal(purchases.length, 1);
  assert.equal(purchases[0].third_party_plan_code, 'TP_PLAN_3');
  assert.equal(purchases[0].purchase_status, 'success');
  assert.ok(purchases[0].raw_connection_code_encrypted);
  assert.doesNotMatch(purchases[0].raw_connection_code_encrypted, /mock-connection/);

  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].public_code, orders[0].delivery_code);

  const orderPage = await fetch(`${baseUrl}/orders/${orderId}`);
  const orderHtml = await orderPage.text();
  assert.match(orderHtml, new RegExp(orders[0].delivery_code));
  assert.doesNotMatch(orderHtml, /mock-connection/);

  const deliveryPage = await fetch(`${baseUrl}/delivery/${orders[0].delivery_code}`);
  const deliveryHtml = await deliveryPage.text();
  assert.match(deliveryHtml, /raw connection code is encrypted/);
  assert.doesNotMatch(deliveryHtml, /mock-connection/);
});

test('admin page requires token and shows purchase status', async () => {
  const locked = await fetch(`${baseUrl}/admin`);
  assert.equal(locked.status, 401);

  const createResponse = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      plan_id: 'growth',
      user_contact: 'team@example.com'
    }),
    redirect: 'manual'
  });
  const orderId = createResponse.headers.get('location').split('/').pop();
  await fetch(`${baseUrl}/orders/${orderId}/pay`, { method: 'POST', redirect: 'manual' });

  const admin = await fetch(`${baseUrl}/admin?token=admin-test-token`);
  assert.equal(admin.status, 200);
  const html = await admin.text();
  assert.match(html, /Purchase Tasks/);
  assert.match(html, /TP_PLAN_8/);
  assert.match(html, /success/);
});
