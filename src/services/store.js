import crypto from 'crypto';
import pg from 'pg';
import { env } from '../utils/env.js';
import { encryptConnectionCode } from './crypto.js';

const { Pool } = pg;
const now = () => new Date().toISOString();

const defaultPlans = [
  {
    id: 'starter',
    name: 'Starter API Access',
    price: 29,
    description: 'Entry package for personal API connection setup.',
    our_plan_code: 'OPENCLAW_A',
    third_party_plan_code: 'TP_PLAN_3',
    enabled: true
  },
  {
    id: 'growth',
    name: 'Growth API Access',
    price: 99,
    description: 'Higher quota package for small teams and production testing.',
    our_plan_code: 'OPENCLAW_B',
    third_party_plan_code: 'TP_PLAN_8',
    enabled: true
  },
  {
    id: 'business',
    name: 'Business API Access',
    price: 299,
    description: 'Managed delivery package with priority manual handling.',
    our_plan_code: 'OPENCLAW_C',
    third_party_plan_code: 'TP_PLAN_ENTERPRISE_2',
    enabled: true
  }
];

const memoryState = {
  plans: [...defaultPlans],
  orders: [],
  third_party_purchases: [],
  delivery_codes: []
};

let pool;
let schemaReady;

function usingPostgres() {
  return Boolean(env.databaseUrl);
}

function getPool() {
  if (!usingPostgres()) {
    if (env.nodeEnv === 'production') {
      const error = new Error('Missing DATABASE_URL for persistent storage');
      error.code = 'missing_database_url';
      throw error;
    }
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
      max: 3
    });
  }
  return pool;
}

async function query(text, params = []) {
  const activePool = getPool();
  await ensureSchema();
  return activePool.query(text, params);
}

export function isDatabaseConfigured() {
  return usingPostgres();
}

export function storageMode() {
  if (usingPostgres()) return 'postgres';
  return env.nodeEnv === 'production' ? 'unconfigured' : 'memory-fallback';
}

export async function ensureSchema() {
  const activePool = getPool();
  if (!activePool) {
    return;
  }
  if (schemaReady) {
    await schemaReady;
    return;
  }

  schemaReady = activePool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL,
      description TEXT NOT NULL,
      our_plan_code TEXT NOT NULL,
      third_party_plan_code TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_contact TEXT NOT NULL,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      pay_status TEXT NOT NULL,
      fulfillment_status TEXT NOT NULL,
      third_party_order_id TEXT,
      delivery_code TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS third_party_purchases (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      third_party_plan_code TEXT NOT NULL,
      purchase_status TEXT NOT NULL,
      raw_connection_code_encrypted TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      manual_intervention_required BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS delivery_codes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      public_code TEXT NOT NULL UNIQUE,
      encrypted_payload TEXT NOT NULL,
      status TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_plan_id ON orders(plan_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_order_id ON third_party_purchases(order_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_order_id ON delivery_codes(order_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_public_code ON delivery_codes(public_code);
  `).then(async () => {
    for (const plan of defaultPlans) {
      await activePool.query(`
        INSERT INTO plans (id, name, price, description, our_plan_code, third_party_plan_code, enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          description = EXCLUDED.description,
          our_plan_code = EXCLUDED.our_plan_code,
          third_party_plan_code = EXCLUDED.third_party_plan_code,
          enabled = EXCLUDED.enabled
      `, [
        plan.id,
        plan.name,
        plan.price,
        plan.description,
        plan.our_plan_code,
        plan.third_party_plan_code,
        plan.enabled
      ]);
    }
  }).catch((error) => {
    schemaReady = null;
    throw error;
  });

  await schemaReady;
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function publicDeliveryCode() {
  return `OC-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizePlan(row) {
  if (!row) return null;
  return {
    ...row,
    price: Number(row.price)
  };
}

export async function listPlans() {
  if (!usingPostgres()) {
    return memoryState.plans.filter((plan) => plan.enabled);
  }
  const result = await query('SELECT * FROM plans WHERE enabled = true ORDER BY price ASC');
  return result.rows.map(normalizePlan);
}

export async function getPlan(planId) {
  if (!usingPostgres()) {
    return memoryState.plans.find((plan) => plan.id === planId && plan.enabled);
  }
  const result = await query('SELECT * FROM plans WHERE id = $1 AND enabled = true', [planId]);
  return normalizePlan(result.rows[0]);
}

export async function listOrders() {
  if (!usingPostgres()) {
    return [...memoryState.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
  return result.rows;
}

export async function listPurchases() {
  if (!usingPostgres()) {
    return [...memoryState.third_party_purchases].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const result = await query('SELECT * FROM third_party_purchases ORDER BY created_at DESC');
  return result.rows;
}

export async function listDeliveryCodes() {
  if (!usingPostgres()) {
    return [...memoryState.delivery_codes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const result = await query('SELECT * FROM delivery_codes ORDER BY created_at DESC');
  return result.rows;
}

export async function getOrder(orderId) {
  if (!usingPostgres()) {
    return memoryState.orders.find((order) => order.id === orderId);
  }
  const result = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return result.rows[0];
}

export async function getPurchase(purchaseId) {
  if (!usingPostgres()) {
    return memoryState.third_party_purchases.find((purchase) => purchase.id === purchaseId);
  }
  const result = await query('SELECT * FROM third_party_purchases WHERE id = $1', [purchaseId]);
  return result.rows[0];
}

export async function getDeliveryByPublicCode(publicCode) {
  if (!usingPostgres()) {
    return memoryState.delivery_codes.find((delivery) => delivery.public_code === publicCode);
  }
  const result = await query('SELECT * FROM delivery_codes WHERE public_code = $1', [publicCode]);
  return result.rows[0];
}

export async function createOrder({ planId, userContact }) {
  const plan = await getPlan(planId);
  if (!plan) {
    const error = new Error('Plan not found');
    error.statusCode = 404;
    throw error;
  }

  const timestamp = now();
  const order = {
    id: id('ord'),
    user_contact: String(userContact).trim().slice(0, 200),
    plan_id: plan.id,
    pay_status: 'pending',
    fulfillment_status: 'waiting_payment',
    third_party_order_id: null,
    delivery_code: null,
    created_at: timestamp,
    updated_at: timestamp
  };

  if (!usingPostgres()) {
    memoryState.orders.push(order);
    return order;
  }

  const result = await query(`
    INSERT INTO orders (
      id, user_contact, plan_id, pay_status, fulfillment_status,
      third_party_order_id, delivery_code, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    order.id,
    order.user_contact,
    order.plan_id,
    order.pay_status,
    order.fulfillment_status,
    order.third_party_order_id,
    order.delivery_code,
    order.created_at,
    order.updated_at
  ]);
  return result.rows[0];
}

export async function markOrderPaid(orderId) {
  const order = await getOrder(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (order.pay_status === 'paid') {
    return order;
  }

  order.pay_status = 'paid';
  order.fulfillment_status = 'purchasing';
  order.updated_at = now();

  if (!usingPostgres()) {
    const target = memoryState.orders.find((item) => item.id === order.id);
    Object.assign(target, order);
  } else {
    await query(`
      UPDATE orders
      SET pay_status = $2, fulfillment_status = $3, updated_at = $4
      WHERE id = $1
    `, [order.id, order.pay_status, order.fulfillment_status, order.updated_at]);
  }

  await createPurchaseForOrder(order);
  return getOrder(order.id);
}

async function createPurchaseForOrder(order) {
  const plan = await getPlan(order.plan_id);
  const timestamp = now();
  const purchase = {
    id: id('pur'),
    order_id: order.id,
    third_party_plan_code: plan.third_party_plan_code,
    purchase_status: 'queued',
    raw_connection_code_encrypted: null,
    error_message: null,
    created_at: timestamp,
    updated_at: timestamp,
    retry_count: 0,
    manual_intervention_required: false
  };

  if (!usingPostgres()) {
    memoryState.third_party_purchases.push(purchase);
  } else {
    await query(`
      INSERT INTO third_party_purchases (
        id, order_id, third_party_plan_code, purchase_status,
        raw_connection_code_encrypted, error_message, created_at, updated_at,
        retry_count, manual_intervention_required
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      purchase.id,
      purchase.order_id,
      purchase.third_party_plan_code,
      purchase.purchase_status,
      purchase.raw_connection_code_encrypted,
      purchase.error_message,
      purchase.created_at,
      purchase.updated_at,
      purchase.retry_count,
      purchase.manual_intervention_required
    ]);
  }

  await processPurchase(purchase.id);
  return getPurchase(purchase.id);
}

export async function processPurchase(purchaseId) {
  const purchase = await getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }

  const order = await getOrder(purchase.order_id);
  try {
    const rawConnectionCode = `mock-connection-${purchase.third_party_plan_code}-${crypto.randomBytes(10).toString('hex')}`;
    const encrypted = encryptConnectionCode(rawConnectionCode);
    const thirdPartyOrderId = id('tpo');
    const timestamp = now();

    purchase.purchase_status = 'success';
    purchase.error_message = null;
    purchase.manual_intervention_required = false;
    purchase.raw_connection_code_encrypted = encrypted;
    purchase.updated_at = timestamp;

    order.third_party_order_id = thirdPartyOrderId;
    order.fulfillment_status = 'fulfilled';
    order.updated_at = timestamp;

    const delivery = await createDeliveryCode(order.id, encrypted);
    order.delivery_code = delivery.public_code;
    order.updated_at = now();

    if (!usingPostgres()) {
      const targetPurchase = memoryState.third_party_purchases.find((item) => item.id === purchase.id);
      const targetOrder = memoryState.orders.find((item) => item.id === order.id);
      Object.assign(targetPurchase, purchase);
      Object.assign(targetOrder, order);
    } else {
      await query(`
        UPDATE third_party_purchases
        SET purchase_status = $2,
            raw_connection_code_encrypted = $3,
            error_message = $4,
            manual_intervention_required = $5,
            updated_at = $6
        WHERE id = $1
      `, [
        purchase.id,
        purchase.purchase_status,
        purchase.raw_connection_code_encrypted,
        purchase.error_message,
        purchase.manual_intervention_required,
        purchase.updated_at
      ]);
      await query(`
        UPDATE orders
        SET third_party_order_id = $2,
            fulfillment_status = $3,
            delivery_code = $4,
            updated_at = $5
        WHERE id = $1
      `, [
        order.id,
        order.third_party_order_id,
        order.fulfillment_status,
        order.delivery_code,
        order.updated_at
      ]);
    }

    return getPurchase(purchase.id);
  } catch (error) {
    return failPurchase(purchase, order, error.message);
  }
}

async function failPurchase(purchase, order, message) {
  const timestamp = now();
  purchase.purchase_status = 'failed';
  purchase.error_message = message;
  purchase.manual_intervention_required = true;
  purchase.updated_at = timestamp;
  order.fulfillment_status = 'manual_review';
  order.updated_at = timestamp;

  if (!usingPostgres()) {
    const targetPurchase = memoryState.third_party_purchases.find((item) => item.id === purchase.id);
    const targetOrder = memoryState.orders.find((item) => item.id === order.id);
    Object.assign(targetPurchase, purchase);
    Object.assign(targetOrder, order);
    return purchase;
  }

  await query(`
    UPDATE third_party_purchases
    SET purchase_status = $2, error_message = $3, manual_intervention_required = true, updated_at = $4
    WHERE id = $1
  `, [purchase.id, purchase.purchase_status, purchase.error_message, purchase.updated_at]);
  await query(`
    UPDATE orders SET fulfillment_status = $2, updated_at = $3 WHERE id = $1
  `, [order.id, order.fulfillment_status, order.updated_at]);
  return getPurchase(purchase.id);
}

export async function retryPurchase(purchaseId) {
  const purchase = await getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }

  purchase.retry_count = Number(purchase.retry_count || 0) + 1;
  purchase.purchase_status = 'retrying';
  purchase.error_message = null;
  purchase.manual_intervention_required = false;
  purchase.updated_at = now();

  if (!usingPostgres()) {
    const target = memoryState.third_party_purchases.find((item) => item.id === purchase.id);
    Object.assign(target, purchase);
  } else {
    await query(`
      UPDATE third_party_purchases
      SET retry_count = $2,
          purchase_status = $3,
          error_message = $4,
          manual_intervention_required = $5,
          updated_at = $6
      WHERE id = $1
    `, [
      purchase.id,
      purchase.retry_count,
      purchase.purchase_status,
      purchase.error_message,
      purchase.manual_intervention_required,
      purchase.updated_at
    ]);
  }

  return processPurchase(purchase.id);
}

export async function markPurchaseManual(purchaseId, reason = 'Manual intervention required') {
  const purchase = await getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }
  const order = await getOrder(purchase.order_id);
  purchase.purchase_status = 'manual_review';
  purchase.error_message = reason;
  purchase.manual_intervention_required = true;
  purchase.updated_at = now();
  order.fulfillment_status = 'manual_review';
  order.updated_at = now();

  if (!usingPostgres()) {
    const targetPurchase = memoryState.third_party_purchases.find((item) => item.id === purchase.id);
    const targetOrder = memoryState.orders.find((item) => item.id === order.id);
    Object.assign(targetPurchase, purchase);
    Object.assign(targetOrder, order);
    return purchase;
  }

  await query(`
    UPDATE third_party_purchases
    SET purchase_status = $2,
        error_message = $3,
        manual_intervention_required = true,
        updated_at = $4
    WHERE id = $1
  `, [purchase.id, purchase.purchase_status, purchase.error_message, purchase.updated_at]);
  await query(`
    UPDATE orders SET fulfillment_status = $2, updated_at = $3 WHERE id = $1
  `, [order.id, order.fulfillment_status, order.updated_at]);
  return getPurchase(purchase.id);
}

async function createDeliveryCode(orderId, encryptedPayload) {
  const timestamp = now();
  const delivery = {
    id: id('del'),
    order_id: orderId,
    public_code: publicDeliveryCode(),
    encrypted_payload: encryptedPayload,
    status: 'active',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    created_at: timestamp,
    updated_at: timestamp
  };

  if (!usingPostgres()) {
    memoryState.delivery_codes.push(delivery);
    return delivery;
  }

  const result = await query(`
    INSERT INTO delivery_codes (
      id, order_id, public_code, encrypted_payload, status, expires_at, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    delivery.id,
    delivery.order_id,
    delivery.public_code,
    delivery.encrypted_payload,
    delivery.status,
    delivery.expires_at,
    delivery.created_at,
    delivery.updated_at
  ]);
  return result.rows[0];
}

export async function resetStoreForTests() {
  memoryState.orders = [];
  memoryState.third_party_purchases = [];
  memoryState.delivery_codes = [];
}
