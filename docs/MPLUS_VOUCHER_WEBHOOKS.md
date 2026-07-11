# Mplus voucher webhooks — Woof ID

This document describes how to configure MplusKASSA webhooks so Woof ID vouchers (`WVH…` codes) apply automatic discounts at the till.

## Overview

1. Customer redeems Woof Coins in the app → receives a voucher code (`WVH` + hex).
2. At the till, staff scans the voucher QR/barcode (or customer scans at kiosk for validation).
3. **scanCode** webhook recognizes the voucher and links it to the kassa session.
4. When the matching article is rung up, **addSessionLine** applies a 100% external discount (free Licky MVP).
5. On payment, **completeSession** marks the voucher as `REDEEMED`.

Kiosk/tablet validation (`/admin/voucher-display`) only sets status `VALIDATED` — the voucher is consumed when payment completes at the kassa.

## Environment

| Variable | Description |
|----------|-------------|
| `MPLUS_WEBHOOK_SECRET` | Base64 HMAC secret from Mplus webhook subscription |
| `DATABASE_URL` | PostgreSQL (stores vouchers + session context) |

## Webhook subscription (Mplus backoffice / Q3300)

Create **one** webhook subscription with base URL:

```
https://<your-woof-id-domain>/api/mplus/webhooks
```

Production example (Doggy Beach House):

```
https://woof.doggybeachhouse.com/api/mplus/webhooks
```

Enable these events:

| Event | Path | Blocking? | Purpose |
|-------|------|-----------|---------|
| `scanCode` | `/scanCode` | No | Recognize `WVH…` vouchers and Woof Wallet barcodes |
| `addSessionLine` | `/addSessionLine` | **Yes** | Apply external discount when matching article is added |
| `completeSession` | `/completeSession` | No | Mark voucher redeemed after payment |

Mplus appends the event name to the base URL, e.g.  
`https://woof.doggybeachhouse.com/api/mplus/webhooks/scanCode`

Alternate kebab-case aliases also work: `/scan-code`, `/add-session-line`, `/complete-session`.

### scanCode filter pattern

Add a regex filter so only Woof voucher codes are forwarded:

```
WVH.*
```

Optionally add a second subscription or pattern for Woof Wallet gift card numbers if needed.

### Signature

All requests include `X-Mplus-Signature` (HMAC-SHA256, base64). Responses must be signed with the same secret. Woof ID verifies incoming signatures and signs all JSON responses.

Copy the subscription **secret** (Base64) into the Woof ID Vercel env var `MPLUS_WEBHOOK_SECRET`.

---

## Dealer setup — MplusKASSA Q3300 (Mac / Windows VM)

Use this checklist when webhooks are not configured yet. The Woof ID app side is ready; the kassa must call the three webhook endpoints.

### 1. Prerequisites

| Item | Value |
|------|-------|
| Woof ID URL | `https://woof.doggybeachhouse.com` (or your deployment) |
| Webhook base | `https://woof.doggybeachhouse.com/api/mplus/webhooks` |
| Vercel env | `MPLUS_WEBHOOK_SECRET` = Base64 secret from step 2 |
| Test voucher | Redeem **Gratis Licky** in app → code like `WVH1A2B3C4D5E6` |

### 2. Create webhook subscription (Mplus backoffice)

In **Mplus backoffice** (not on the kassa itself):

1. Open **Instellingen → Webhooks** (or **Q3300 → Webhook-abonnementen** depending on Mplus version).
2. **Nieuw abonnement** with URL: `https://woof.doggybeachhouse.com/api/mplus/webhooks`
3. Enable events: `scanCode`, `addSessionLine`, `completeSession`.
4. For **scanCode** only, set filter/pattern: `WVH.*`
5. Copy the generated **HMAC secret** (Base64) → paste into Vercel → `MPLUS_WEBHOOK_SECRET` → redeploy Woof ID.
6. Save the subscription and assign it to the **Doggy Beach House** branch/kassa.

> **Blocking:** `addSessionLine` must be **blocking** (kassa waits for response). `scanCode` and `completeSession` are non-blocking.

### 3. Kassa behaviour (what staff should see)

1. Customer opens **Rewards** in Woof ID and shows the voucher (QR + Code128 barcode).
2. Cashier scans the code (handheld scanner or built-in) during an open kassa session.
3. Kassa shows recognition message, e.g. *"Woof voucher: Gratis Licky (WVH…)"*.
4. Cashier rings article **204** (Hondenijsje Bark & BRRR / Licky).
5. Line gets **100% external discount** — "Woof ID — Gratis Licky".
6. After payment, voucher status becomes **REDEEMED** in Woof ID admin.

### 4. Barcode format (app → kassa)

| Display | Content | Format |
|---------|---------|--------|
| QR code | Raw voucher code, e.g. `WVH1A2B3C4D5E6` | Standard QR |
| Barcode | Same raw code | **Code128** (alphanumeric) |

Both encode the identical `WVH` + 12 hex characters string. Mplus `scanCode` receives `scannedCode` and matches `^WVH[A-F0-9]+$`.

### 5. Smoke test (dealer)

1. Redeem a test voucher in Woof ID (use a test dog / dev branch if available).
2. On kassa: start a session → scan the voucher from the phone screen.
3. Expect cashier message within ~2s. If not recognized, check webhook logs in Mplus backoffice.
4. Add article **204** → confirm 100% discount on the line.
5. Complete payment → voucher disappears from customer's active vouchers in the app.

### 6. Troubleshooting (dealer)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Nothing happens on scan | Webhooks not subscribed or wrong URL | Re-check base URL and event list |
| 401/invalid signature | Secret mismatch | Same Base64 secret in Mplus + Vercel `MPLUS_WEBHOOK_SECRET` |
| Code not forwarded | Missing `WVH.*` filter on wrong event | Filter only on `scanCode` subscription |
| Recognized but no discount | Article not in map or wrong number | Use article **204** for free-licky; see `rewardArticleMap.ts` |
| Discount OK but voucher still active | `completeSession` missing | Enable `completeSession` webhook |
| Scan works at kiosk only | Kiosk sets `VALIDATED`, not `REDEEMED` | Normal — final redemption is at payment via `completeSession` |

## Article mapping (free Licky MVP)

| Reward ID | Coins | Mplus article | Discount |
|-----------|-------|---------------|----------|
| `free-licky` | 300 | **204** — Hondenijsje Bark & BRRR (Dog Bar / kassa zelf maken) | 100% |
| `free-ball` | 400 | *TODO — confirm with DBH* | 100% |
| `discount-10` | 500 | Session-level (not yet implemented) | 10% |
| `snack-bag` | 1000 | *TODO — confirm with DBH* | 100% |

Mapping lives in `src/lib/mplus/rewardArticleMap.ts`.

## Flow details

### scanCode

**Request** (from Mplus): `scanCode.scannedCode`, `session.sessionId`, …

**When code matches `WVH…`:**
- Lookup `RewardVoucher` with status `ACTIVE` or `VALIDATED`
- Store `MplusSessionContext` (sessionId → dogProfileId, voucherId, rewardId)
- Response:
  ```json
  {
    "scanCode": {
      "recognized": true,
      "message": "Woof voucher: Gratis Licky (WVH…)",
      "customerMessage": "Hoi! … heeft een Gratis Licky-voucher."
    }
  }
  ```

**When code matches a linked Woof Wallet** (`WoofWalletLink.walletCardId`):
- Store session context with `dogProfileId` only (for wallet purchase tracking via existing `completeSession` handler)

### addSessionLine (blocking, &lt;2s)

**When** session has voucher context and the new line’s `articleNumber` matches the reward map:
- Generate/store `mplusDiscountId` on the voucher
- Response:
  ```json
  {
    "lineChanges": [{
      "lineId": "<uuid>",
      "externalDiscount": {
        "discountId": "<uuid>",
        "discountDescription": "Woof ID — Gratis Licky",
        "discountPercentage": 100,
        "discountType": "woof-voucher",
        "applyToQuantity": 1
      }
    }]
  }
  ```

### completeSession

Existing handler processes Woof Wallet purchases. Additionally:
- Finds voucher by `externalDiscount.discountId` on session lines, or by `mplusSessionId`
- Sets voucher status to `REDEEMED` and `redeemedAt`

## Voucher statuses

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Issued, not yet used at till |
| `VALIDATED` | Scanned at kiosk/tablet — still usable at kassa |
| `REDEEMED` | Payment completed with discount |
| `CANCELLED` | Manually cancelled |

## Testing checklist

1. Redeem free-licky in app → voucher appears on `/rewards` and dog profile.
2. Configure webhooks in Mplus test branch.
3. Start kassa session → scan `WVH…` code → cashier sees recognition message.
4. Ring article **204** → line shows 100% external discount.
5. Complete payment → voucher shows `REDEEMED` in admin.
6. Kiosk scan alone does **not** set `REDEEMED`.

## Troubleshooting

- **Code not recognized**: Check `scanCode` subscription and `WVH.*` filter; verify voucher is `ACTIVE` or `VALIDATED`.
- **No discount on article**: Confirm article number in `rewardArticleMap.ts`; ensure voucher was scanned in same session before adding the line.
- **Voucher not redeemed after payment**: Check `completeSession` webhook logs; verify `externalDiscount.discountId` is present on paid lines.
