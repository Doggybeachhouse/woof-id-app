import assert from "node:assert/strict";

import { coinsFromPurchaseEur } from "./receiptCoins";
import { estimateReceiptTotalEur } from "./receiptTotal.server";

assert.equal(coinsFromPurchaseEur(16.23), 16);
assert.equal(coinsFromPurchaseEur(16.8), 17);
assert.equal(coinsFromPurchaseEur(16.5), 17);
assert.equal(coinsFromPurchaseEur(0), 0);
assert.equal(coinsFromPurchaseEur(-5), 0);

assert.equal(
  estimateReceiptTotalEur([
    { normalizedName: "Test", quantity: 2, unitPriceEur: 4.99 },
    { normalizedName: "Other", quantity: 1, unitPriceEur: 3.5 },
  ]),
  13.48,
);
assert.equal(coinsFromPurchaseEur(13.48), 13);

console.log("receipt coins: ok");
