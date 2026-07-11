import { getMplusCredentials } from "@/lib/mplus/config";
import { mplusSoapCall } from "@/lib/mplus/client";
import {
  normalizeReceiptBarcode,
  receiptBarcodeEquivalents,
  receiptBarcodesMatch,
} from "@/lib/receipts/barcode";
import {
  centsToEur,
  extractSoapBody,
  mplusQuantity,
  readAllBlocks,
  readNumber,
  readText,
  stripNamespaces,
  toMplusDate,
} from "@/lib/mplus/xml";

export type MplusReceiptLine = {
  name: string;
  quantity: number;
  articleNumber?: string;
};

export type MplusReceiptLookup = {
  barcode: string;
  receiptId: string;
  totalEur: number;
  lines: MplusReceiptLine[];
};

/** @deprecated Use receiptBarcodeEquivalents from @/lib/receipts/barcode */
export function barcodeMatchCandidates(value: string): string[] {
  return receiptBarcodeEquivalents(value);
}

function transactionStringMatches(scanned: string, transactionString: string): boolean {
  const stored = normalizeReceiptBarcode(transactionString);
  if (!stored) return false;
  // transactionString is an internal id — only accept exact / leading-zero matches.
  return stored === scanned || receiptBarcodesMatch(scanned, stored);
}

function parseReceiptLines(receiptXml: string): MplusReceiptLine[] {
  const lines: MplusReceiptLine[] = [];

  for (const lineXml of readAllBlocks(receiptXml, "line")) {
    const articleNumber = readNumber(lineXml, "articleNumber");
    if (articleNumber === null || articleNumber <= 0) continue;

    const dataXml = readAllBlocks(lineXml, "data")[0] ?? "";
    const quantityRaw = readNumber(dataXml, "quantity") ?? readNumber(lineXml, "quantity") ?? 1;
    const decimalPlaces =
      readNumber(dataXml, "decimalPlaces") ?? readNumber(lineXml, "decimalPlaces") ?? 0;

    const name =
      readText(lineXml, "text")?.trim() ||
      readText(lineXml, "menuDescription")?.trim() ||
      `Artikel ${articleNumber}`;

    lines.push({
      name,
      quantity: Math.max(1, Math.round(mplusQuantity(quantityRaw, decimalPlaces))),
      articleNumber: String(articleNumber),
    });
  }

  return lines;
}

function parseReceiptXml(receiptXml: string): MplusReceiptLookup | null {
  const paidAmountCents = readNumber(receiptXml, "paidAmount") ?? 0;
  const lines = parseReceiptLines(receiptXml);
  if (lines.length === 0) return null;

  const rawBarcode =
    readText(receiptXml, "receiptBarcode") ??
    readText(receiptXml, "transactionString");
  const storedBarcode = normalizeReceiptBarcode(rawBarcode ?? "");
  if (!storedBarcode) return null;

  return {
    barcode: storedBarcode,
    receiptId: readText(receiptXml, "receiptId") ?? storedBarcode,
    totalEur: centsToEur(paidAmountCents),
    lines,
  };
}

function parseReceiptsFromXml(xml: string): MplusReceiptLookup[] {
  const body = stripNamespaces(extractSoapBody(xml));
  return readAllBlocks(body, "receipt")
    .map((receiptXml) => parseReceiptXml(receiptXml))
    .filter((receipt): receipt is MplusReceiptLookup => receipt != null);
}

function parseReceipt(xml: string, barcode: string): MplusReceiptLookup | null {
  const normalizedBarcode = normalizeReceiptBarcode(barcode);
  const match = parseReceiptsFromXml(xml).find((receipt) => {
    return (
      receiptBarcodesMatch(normalizedBarcode, receipt.barcode) ||
      transactionStringMatches(normalizedBarcode, receipt.barcode)
    );
  });

  return match ?? null;
}

async function fetchReceiptsForRange(
  from: Date,
  through: Date,
): Promise<string> {
  const credentials = getMplusCredentials();
  if (!credentials) {
    throw new Error("Mplus not configured");
  }

  return mplusSoapCall(
    "getReceipts",
    {
      request: {
        fromFinancialDate: toMplusDate(from),
        throughFinancialDate: toMplusDate(through),
        includeLineList: true,
      },
    },
    credentials,
  );
}

export async function lookupReceiptByDateAndAmount(
  around: Date,
  totalEur: number,
  toleranceEur = 0.02,
): Promise<MplusReceiptLookup | null> {
  const credentials = getMplusCredentials();
  if (!credentials || totalEur <= 0) return null;

  const from = new Date(around);
  from.setHours(0, 0, 0, 0);
  const through = new Date(around);
  through.setHours(23, 59, 59, 999);

  try {
    const xml = await fetchReceiptsForRange(from, through);
    const receipts = parseReceiptsFromXml(xml);
    return (
      receipts.find(
        (receipt) => Math.abs(receipt.totalEur - totalEur) <= toleranceEur,
      ) ?? null
    );
  } catch (error) {
    console.error("[mplus] lookupReceiptByDateAndAmount failed", {
      around: around.toISOString(),
      totalEur,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function lookupReceiptByBarcode(
  barcode: string,
): Promise<MplusReceiptLookup | null> {
  const credentials = getMplusCredentials();
  if (!credentials) return null;

  const normalized = normalizeReceiptBarcode(barcode);
  if (normalized.length < 4) return null;

  const lookbackDays = credentials.receiptLookbackDays;
  const windows = [1, 2, 3, 7, lookbackDays].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  for (const days of windows) {
    const through = new Date();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));

    try {
      const xml = await fetchReceiptsForRange(from, through);
      const receipt = parseReceipt(xml, normalized);
      if (receipt) return receipt;
    } catch (error) {
      console.error("[mplus] getReceipts failed", {
        barcode: normalized,
        candidates: receiptBarcodeEquivalents(normalized),
        days,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}
