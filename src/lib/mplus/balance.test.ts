import assert from "node:assert/strict";

import { isDisplayableCachedBalance } from "./balance";

const confirmedAt = new Date("2026-07-11T08:00:00.000Z");

assert.equal(isDisplayableCachedBalance(12.5, null), true);
assert.equal(isDisplayableCachedBalance(0, confirmedAt), true);
assert.equal(isDisplayableCachedBalance(0, null), false);
assert.equal(isDisplayableCachedBalance(0, undefined), false);
assert.equal(isDisplayableCachedBalance(-1, confirmedAt), false);

console.log("wallet balance cache display rules: ok");
