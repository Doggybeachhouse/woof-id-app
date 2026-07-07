import assert from "node:assert/strict";

import { getCameraVideoConstraints } from "./constraints";

assert.deepEqual(getCameraVideoConstraints("user"), {
  video: { facingMode: { ideal: "user" } },
  audio: false,
});

assert.deepEqual(getCameraVideoConstraints("environment"), {
  video: { facingMode: { ideal: "environment" } },
  audio: false,
});

console.log("camera constraints: ok");
