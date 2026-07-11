import assert from "node:assert/strict";

import {
  receiptBarcodeEquivalents,
  receiptBarcodesMatch,
} from "./barcode";

// EAN-13 scanner drops leading zero.
assert.equal(receiptBarcodesMatch("0123456789012", "123456789012"), true);

// Exact match with leading zeros preserved.
assert.equal(receiptBarcodesMatch("00012345", "00012345"), true);

// Different receipts must not match (regression: padStart / leading-zero strip).
assert.equal(receiptBarcodesMatch("12345", "00012345"), false);
assert.equal(receiptBarcodesMatch("12345678", "000000012345678"), false);

const equivShort = receiptBarcodeEquivalents("12345");
assert.ok(!equivShort.includes("00000000012345"), "must not pad short codes to 13 digits");
assert.ok(!equivShort.includes("00012345"), "must not pad short codes to 8 digits");
assert.deepEqual(equivShort, ["12345"]);

console.log("receipt barcode matching: ok");
