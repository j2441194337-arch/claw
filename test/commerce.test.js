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

const forbiddenFrontText = /OPENCLAW_A|OPENCLAW_B|OPENCLAW_C|TP_PLAN_3|TP_PLAN_8|TP_PLAN_ENTERPRISE_2|mapped purchase plan|our_plan_code|third_party_plan_code|our_plan_id|采购映射|自动采购任务|原始连接信息加密保存|encrypted_payload|后台处理机制/;

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

test('homepage is a Chinese storefront search portal', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /tokyo 多模API商店/);
  assert.match(html, /搜索套餐、使用问题或提交需求/);
  assert.match(html, /购买入门套餐/);
  assert.match(html, /购买进阶套餐/);
  assert.match(html, /购买商务套餐/);
  assert.match(html, /异常情况反馈/);
  assert.match(html, /人工协助/);
  assert.match(html, /常见问题/);
  assert.match(html, /安全可靠/);
  assert.doesNotMatch(html, forbiddenFrontText);
});

test('feedback help and faq pages are available', async () => {
  const feedback = await fetch(`${baseUrl}/feedback`);
  assert.equal(feedback.status, 200);
  assert.match(await feedback.text(), /异常反馈/);

  const help = await fetch(`${baseUrl}/help`);
  assert.equal(help.status, 200);
  assert.match(await help.text(), /帮助中心/);

  const faq = await fetch(`${baseUrl}/faq`);
  assert.equal(faq.status, 200);
  assert.match(await faq.text(), /常见问题/);
});

test('plan and checkout pages hide internal mapping fields', async () => {
  const plans = await fetch(`${baseUrl}/plans`);
  assert.equal(plans.status, 200);
  const plansHtml = await plans.text();
  assert.match(plansHtml, /选择适合你的 AI 套餐/);
  assert.doesNotMatch(plansHtml, forbiddenFrontText);

  const detail = await fetch(`${baseUrl}/plans/starter`);
  assert.equal(detail.status, 200);
  const detailHtml = await detail.text();
  assert.match(detailHtml, /入门套餐/);
  assert.doesNotMatch(detailHtml, forbiddenFrontText);

  const checkout = await fetch(`${baseUrl}/checkout/starter`);
  assert.equal(checkout.status, 200);
  const checkoutHtml = await checkout.text();
  assert.match(checkoutHtml, /提交订单/);
  assert.doesNotMatch(checkoutHtml, forbiddenFrontText);
});

test('order payment creates delivery code without exposing raw or internal details', async () => {
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
  assert.match(orderHtml, /订单状态/);
  assert.doesNotMatch(orderHtml, /mock-connection/);
  assert.doesNotMatch(orderHtml, forbiddenFrontText);

  const deliveryPage = await fetch(`${baseUrl}/delivery/${orders[0].delivery_code}`);
  const deliveryHtml = await deliveryPage.text();
  assert.match(deliveryHtml, /请妥善保存此交付码/);
  assert.match(deliveryHtml, /连接资料由系统安全保管/);
  assert.doesNotMatch(deliveryHtml, /mock-connection/);
  assert.doesNotMatch(deliveryHtml, forbiddenFrontText);
});

test('admin page keeps internal mapping and purchase status', async () => {
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
  assert.match(html, /采购任务/);
  assert.match(html, /our_plan_code/);
  assert.match(html, /third_party_plan_code/);
  assert.match(html, /OPENCLAW_B/);
  assert.match(html, /TP_PLAN_8/);
  assert.match(html, /success/);
});
