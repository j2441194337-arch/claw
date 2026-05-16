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
