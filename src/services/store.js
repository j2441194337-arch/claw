import crypto from 'crypto';
import { encryptConnectionCode } from './crypto.js';

const now = () => new Date().toISOString();

const state = {
  plans: [
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
  ],
  orders: [],
  third_party_purchases: [],
  delivery_codes: []
};

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function publicDeliveryCode() {
  return `OC-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function listPlans() {
  return state.plans.filter((plan) => plan.enabled);
}

export function getPlan(planId) {
  return state.plans.find((plan) => plan.id === planId && plan.enabled);
}

export function listOrders() {
  return [...state.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listPurchases() {
  return [...state.third_party_purchases].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listDeliveryCodes() {
  return [...state.delivery_codes].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getOrder(orderId) {
  return state.orders.find((order) => order.id === orderId);
}

export function getPurchase(purchaseId) {
  return state.third_party_purchases.find((purchase) => purchase.id === purchaseId);
}

export function getDeliveryByPublicCode(publicCode) {
  return state.delivery_codes.find((delivery) => delivery.public_code === publicCode);
}

export function createOrder({ planId, userContact }) {
  const plan = getPlan(planId);
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
  state.orders.push(order);
  return order;
}

export function markOrderPaid(orderId) {
  const order = getOrder(orderId);
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
  createPurchaseForOrder(order);
  return order;
}

function createPurchaseForOrder(order) {
  const plan = getPlan(order.plan_id);
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
  state.third_party_purchases.push(purchase);
  processPurchase(purchase.id);
  return purchase;
}

export function processPurchase(purchaseId) {
  const purchase = getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }

  const order = getOrder(purchase.order_id);
  try {
    purchase.purchase_status = 'success';
    purchase.error_message = null;
    purchase.manual_intervention_required = false;
    purchase.updated_at = now();

    const rawConnectionCode = `mock-connection-${purchase.third_party_plan_code}-${crypto.randomBytes(10).toString('hex')}`;
    purchase.raw_connection_code_encrypted = encryptConnectionCode(rawConnectionCode);
    order.third_party_order_id = id('tpo');
    order.fulfillment_status = 'fulfilled';
    order.updated_at = now();

    const delivery = createDeliveryCode(order.id, purchase.raw_connection_code_encrypted);
    order.delivery_code = delivery.public_code;
    order.updated_at = now();
    return purchase;
  } catch (error) {
    purchase.purchase_status = 'failed';
    purchase.error_message = error.message;
    purchase.manual_intervention_required = true;
    purchase.updated_at = now();
    order.fulfillment_status = 'manual_review';
    order.updated_at = now();
    return purchase;
  }
}

export function retryPurchase(purchaseId) {
  const purchase = getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }
  purchase.retry_count += 1;
  purchase.purchase_status = 'retrying';
  purchase.error_message = null;
  purchase.manual_intervention_required = false;
  purchase.updated_at = now();
  return processPurchase(purchase.id);
}

export function markPurchaseManual(purchaseId, reason = 'Manual intervention required') {
  const purchase = getPurchase(purchaseId);
  if (!purchase) {
    const error = new Error('Purchase task not found');
    error.statusCode = 404;
    throw error;
  }
  const order = getOrder(purchase.order_id);
  purchase.purchase_status = 'manual_review';
  purchase.error_message = reason;
  purchase.manual_intervention_required = true;
  purchase.updated_at = now();
  order.fulfillment_status = 'manual_review';
  order.updated_at = now();
  return purchase;
}

function createDeliveryCode(orderId, encryptedPayload) {
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
  state.delivery_codes.push(delivery);
  return delivery;
}

export function resetStoreForTests() {
  state.orders = [];
  state.third_party_purchases = [];
  state.delivery_codes = [];
}
