import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  signMplusPayload,
  verifyMplusSignature,
} from "./signature";

const exampleSecret = "eFc5HrxwLbONJ+EYXrbHB+a9HueYIQzotgKRLRVAfx0=";
const exampleMessage = "test";

const key = Buffer.from(exampleSecret, "base64");
const hash = createHmac("sha256", key).update(exampleMessage).digest("base64");

assert.equal(hash, "EBFFIb5qPH/teEFmjtwcIj6h80cl+X1DUy62D46tnu8=");
assert.equal(signMplusPayload(exampleMessage, exampleSecret), hash);
assert.equal(
  verifyMplusSignature(exampleMessage, hash, exampleSecret),
  true,
);
assert.equal(
  verifyMplusSignature(exampleMessage, "invalid-signature", exampleSecret),
  false,
);

console.log("mplus webhook signature: ok");
