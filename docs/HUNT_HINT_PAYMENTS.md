# Hunt hint payments (WooCommerce / iDEAL)

The Woof ID app sells scavenger hunt hints at **€1.50** via the same WordPress REST bridge as wallet top-up (`wwm/v1`, `X-Woof-Id-Secret`).

The **Woof Wallet** plugin on doggybeachhouse.com already exposes `/woof-id/topup`. Add two sibling routes for hunt hints.

## Required REST routes

Base: `POST https://doggybeachhouse.com/wp-json/wwm/v1`

| Route | Purpose |
|-------|---------|
| `/woof-id/hunt-hint` | Create WooCommerce checkout for one hint (€1.50) |
| `/woof-id/hunt-hint/status` | Poll whether order is paid |

### `POST /woof-id/hunt-hint`

**Request body (JSON):**

```json
{
  "email": "owner@example.com",
  "amount_eur": "1.50",
  "progress_id": "clx…",
  "checkpoint_index": 2,
  "return_url": "https://woof.doggybeachhouse.com/hunt?dogId=…&hintReturn=…"
}
```

**Success response:**

```json
{
  "ok": true,
  "checkout_url": "https://doggybeachhouse.com/checkout/order-pay/…",
  "order_id": 12345,
  "amount_eur": 1.5
}
```

**Behaviour (mirror top-up):**

1. Resolve WooCommerce customer by `email`.
2. Add a fixed **“Woof ID speurtocht hint”** product (€1.50) to cart — one line, qty 1.
3. Store metadata on the order:
   - `_woof_id_hunt_hint` = `1`
   - `_woof_id_progress_id` = `progress_id`
   - `_woof_id_checkpoint_index` = `checkpoint_index`
4. Redirect checkout `return_url` to the app `return_url` after payment (same as top-up).
5. Payment method: existing iDEAL / WooCommerce flow.

### `POST /woof-id/hunt-hint/status`

**Request body:**

```json
{
  "email": "owner@example.com",
  "order_id": 12345
}
```

**Success response:**

```json
{
  "ok": true,
  "paid": true,
  "amount_eur": 1.5
}
```

Validate that the order belongs to the customer email and has hunt-hint metadata. `paid` = order status `processing` or `completed` (same rules as top-up).

## WooCommerce product

Create a simple virtual product:

- **Name:** Woof ID speurtocht hint / Scavenger hunt hint
- **Price:** €1.50
- **SKU (suggested):** `woof-id-hunt-hint`

Configure the plugin option (or hardcode product ID) like the top-up product.

## App-side flow

1. User taps **Koop hint (€1,50)** → `POST /api/hunt/hint/purchase`
2. App creates `ScavengerHuntHintPurchase` + return token → redirects to `checkout_url`
3. After iDEAL payment, user returns to `/hunt?dogId=…&hintReturn=TOKEN`
4. App calls `POST /api/hunt/hint/complete` → polls WP status → creates `ScavengerHuntHintReveal` (PAID)
5. Backup: `HuntHintReturnWatcher` polls `/api/hunt/hint/status` if user lands without token

## Environment

Same as wallet top-up:

- `WOOF_WALLET_STORE_URL`
- `WOOF_WALLET_API_SECRET`
- `NEXTAUTH_URL` (for signed return links)

## Not in this repo

The live `/woof-id/topup` handlers live in the **Woof Wallet** WordPress plugin on production, not in `wordpress/doggy-woof-bridge/`. Copy the top-up handler pattern and swap product + order meta for hunt hints.

`wordpress/doggy-woof-bridge/` only adds My Account links; payment routes belong in Woof Wallet (or a small shared “Woof ID payments” module).
