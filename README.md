# OpenClaw Delivery

OpenClaw Delivery is a third-party API package purchase and encrypted delivery platform.

The current focus is no longer an OpenAI-compatible request proxy. Users should not call our `/v1/chat/completions` endpoint and expect request forwarding. The product flow is:

1. User visits the site.
2. User chooses one of our storefront plans.
3. User creates an order and pays on our platform.
4. Payment success triggers a purchase task.
5. The purchase task uses the plan mapping table: `our_plan_id -> third_party_plan_code`.
6. The third-party platform returns a connection code, authorization code, or key.
7. The raw third-party code is encrypted and stored server-side.
8. OpenClaw generates a public delivery code.
9. The user sees only the public delivery code and uses it to complete connection.

Stage 1 simulates payment and third-party purchasing. Stage 2 can replace the mock purchase worker with a real third-party API or browser automation workflow.

## Data Structures

### `plans`

- `id`
- `name`
- `price`
- `description`
- `our_plan_code`
- `third_party_plan_code`
- `enabled`

### `orders`

- `id`
- `user_contact`
- `plan_id`
- `pay_status`
- `fulfillment_status`
- `third_party_order_id`
- `delivery_code`
- `created_at`
- `updated_at`

### `third_party_purchases`

- `id`
- `order_id`
- `third_party_plan_code`
- `purchase_status`
- `raw_connection_code_encrypted`
- `error_message`
- `created_at`

The implementation also tracks `updated_at`, `retry_count`, and `manual_intervention_required`.

### `delivery_codes`

- `id`
- `order_id`
- `public_code`
- `encrypted_payload`
- `status`
- `expires_at`

The current MVP stores these records in process memory so it is deployable without extra services. Production should move them to an encrypted database before real sales.

## Website Routes

- `GET /` homepage
- `GET /plans` package list
- `GET /plans/:planId` package detail
- `GET /checkout/:planId` order page
- `POST /orders` create order
- `POST /orders/:orderId/pay` simulate payment success
- `GET /orders` order lookup
- `GET /orders/:orderId` order status and delivery code
- `GET /delivery/:publicCode` user delivery page
- `GET /admin` admin overview for orders, purchases, and delivery codes
- `POST /admin/purchases/:purchaseId/retry` retry purchase task
- `POST /admin/purchases/:purchaseId/manual` mark purchase for manual handling
- `GET /api/health` service health
- `GET /api/status` system status

## Environment Variables

Set these in Vercel Environment Variables:

```bash
NODE_ENV=production
PORT=3000
DELIVERY_ENCRYPTION_KEY=replace-with-long-random-secret
ADMIN_TOKEN=replace-with-admin-token
THIRD_PARTY_ACCOUNT=
THIRD_PARTY_PASSWORD=
```

Notes:

- `DELIVERY_ENCRYPTION_KEY` protects encrypted third-party connection payloads.
- `ADMIN_TOKEN` is required for the admin page in production. Use `?token=...` or `X-Admin-Token`.
- `THIRD_PARTY_ACCOUNT` and `THIRD_PARTY_PASSWORD` are placeholders for Stage 2 integrations and must stay in environment variables only.
- Do not write real credentials, raw connection codes, API keys, cookies, or tokens into GitHub.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Then visit:

- `http://localhost:3000/`
- `http://localhost:3000/plans`
- `http://localhost:3000/admin`

In non-production mode, the admin page is open when `ADMIN_TOKEN` is not set. In production, set `ADMIN_TOKEN`.

## Stage 1 Fulfillment Flow

1. Choose a plan from `/plans`.
2. Create an order from `/checkout/:planId`.
3. Click "Simulate payment success" on the order page.
4. The system creates a third-party purchase task using the mapped `third_party_plan_code`.
5. The mock purchase worker generates a fake raw connection code.
6. The raw code is encrypted with AES-256-GCM.
7. The system generates an `OC-...` public delivery code.
8. The user sees the public delivery code on the order and delivery pages.

The raw third-party connection code is never shown to the frontend.

## Vercel Deployment

Recommended Vercel settings:

- Root Directory: `./`
- Application Preset: `Other`
- Install Command: `npm install`
- Build Command: leave empty
- Output Directory: leave empty

The project uses `vercel.json` to route requests to `src/server.js` through `@vercel/node`.

## Security

- Do not commit `.env`, `.vercel/`, `node_modules/`, logs, real credentials, or raw connection codes.
- Do not expose the third-party raw connection code to the frontend.
- Store sensitive values in environment variables or an encrypted database.
- Users should only see the generated delivery code.
- Purchase failures must be retryable and can be marked for manual intervention.
- Orders and delivery statuses must be recorded.

## Tests

```bash
npm test
```

The test suite covers plan pages, order creation, simulated payment, mapped purchase creation, encrypted delivery payloads, delivery lookup, and admin status.
