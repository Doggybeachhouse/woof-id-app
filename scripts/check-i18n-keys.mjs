import fs from "fs";
import path from "path";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const raw = walk("src")
  .flatMap((file) => {
    const content = fs.readFileSync(file, "utf8");
    return [...content.matchAll(/t\(["`]([^"`]+)["`]/g)].map((m) => m[1]);
  })
  .join("\n");

const staticKeys = new Set();
for (const key of raw.trim().split("\n").filter(Boolean)) {
  if (!key.includes("${")) staticKeys.add(key);
}

// Dynamic expansions used in code
const receiptErrorKeys = [
  "selectDogAndBarcode",
  "duplicateBarcode",
  "duplicateBarcodeOtherDog",
  "alreadyClaimed",
  "alreadyClaimedCoins",
  "dailyLimit",
  "dogNotFound",
];
for (const k of receiptErrorKeys) staticKeys.add(`errors.receipts.${k}`);

const rewardIds = ["free-licky", "free-ball", "discount-10", "snack-bag"];
for (const id of rewardIds) {
  staticKeys.add(`rewards.items.${id}.title`);
  staticKeys.add(`rewards.items.${id}.description`);
  staticKeys.add(`rewards.items.${id}.terms`);
}

const achievements = [
  "first_visit",
  "beach_regular",
  "doggy_beach_fan",
  "beach_legend",
  "first_topup",
  "wallet_lover",
  "big_spender",
  "receipt_rookie",
  "snack_lover",
  "licky_lover",
  "toy_collector",
  "photo_pup",
];
for (const s of achievements) {
  staticKeys.add(`achievements.${s}.name`);
  staticKeys.add(`achievements.${s}.description`);
}

// nav config keys
for (const k of [
  "nav.links.home",
  "nav.tabs.home",
  "nav.links.checkIn",
  "nav.tabs.checkInShort",
  "nav.links.topUp",
  "nav.tabs.topUpShort",
  "nav.links.account",
  "nav.tabs.accountShort",
]) {
  staticKeys.add(k);
}

// mplus webhook
staticKeys.add("mplus.webhook.pushTitle");
staticKeys.add("mplus.webhook.pushBody");

function hasKey(obj, key) {
  const parts = key.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || !(p in cur)) return false;
    cur = cur[p];
  }
  return typeof cur === "string";
}

for (const locale of ["nl", "en", "de"]) {
  const msgs = JSON.parse(
    fs.readFileSync(`src/i18n/messages/${locale}.json`, "utf8"),
  );
  const missing = [...staticKeys].filter((k) => !hasKey(msgs, k)).sort();
  console.log(`=== ${locale} missing (${missing.length}) ===`);
  for (const k of missing) console.log(k);
}
