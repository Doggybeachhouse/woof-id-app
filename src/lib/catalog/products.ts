import fs from "node:fs";
import path from "node:path";

import { parseProductCategory } from "@/lib/receipts/categories";

export type CatalogProduct = {
  articleNumber: string;
  name: string;
  priceEur: number | null;
  turnoverGroup: string;
};

let cache: CatalogProduct[] | null = null;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ";" && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/"/g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function loadProductCatalog(): CatalogProduct[] {
  if (cache) return cache;

  const csvPath = path.join(process.cwd(), "data", "artikelen.csv");
  if (!fs.existsSync(csvPath)) {
    cache = [];
    return cache;
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const products: CatalogProduct[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('"Inkoopprijs')) continue;
    const cols = parseCsvLine(line);
    const articleNumber = cols[0]?.replace(/"/g, "").trim();
    const name = cols[1]?.replace(/"/g, "").trim();
    if (!articleNumber || !name) continue;

    products.push({
      articleNumber,
      name,
      priceEur: parsePrice(cols[2] ?? ""),
      turnoverGroup: cols[4]?.replace(/"/g, "").trim() ?? "",
    });
  }

  products.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  cache = products;
  return cache;
}

export function guessCategoryFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("licky") || lower.includes("ijs")) {
    return parseProductCategory("LICKY");
  }
  if (lower.includes("snack") || lower.includes("woofin") || lower.includes("bix")) {
    return parseProductCategory("SNACKS");
  }
  if (lower.includes("speel") || lower.includes("toy") || lower.includes("bal")) {
    return parseProductCategory("TOYS");
  }
  if (lower.includes("halsband") || lower.includes("riem") || lower.includes("mand")) {
    return parseProductCategory("ACCESSORIES");
  }
  return parseProductCategory("OTHER");
}

export function searchCatalog(query: string, limit = 40): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  const all = loadProductCatalog();
  if (!q) return all.slice(0, limit);
  return all
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.articleNumber.includes(q) ||
        p.turnoverGroup.toLowerCase().includes(q),
    )
    .slice(0, limit);
}
