import { MplusApiError, mplusSoapCall } from "@/lib/mplus/client";
import { getMplusCredentials } from "@/lib/mplus/config";
import {
  centsToEur,
  extractSoapBody,
  readAllBlocks,
  readBoolean,
  readNumber,
  readText,
  stripNamespaces,
} from "@/lib/mplus/xml";

export type MplusGiftcard = {
  cardId: string;
  cardNumber: string;
  active: boolean;
  currentBalanceCents: number;
  currentBalanceEur: number;
  cardTypeId: string;
  validUntil: string | null;
};

export type MplusGiftcardType = {
  cardTypeId: string;
  name: string;
  reloadable: boolean;
  redeemable: boolean;
};

export type MplusGiftcardHistoryEntry = {
  bookingAmountCents: number;
  bookingAmountEur: number;
  balanceAfterBookingCents: number | null;
  balanceAfterBookingEur: number | null;
  result: string;
  dateTime: string | null;
  bookDate: string | null;
  externalReference: string | null;
};

let giftcardTypesCache:
  | { fetchedAt: number; types: MplusGiftcardType[] }
  | null = null;

const GIFT_CARD_TYPES_TTL_MS = 24 * 60 * 60 * 1000;

function readGiftcardBalanceCents(xml: string): number | null {
  for (const tag of [
    "currentBalance",
    "balance",
    "saldo",
    "remainingBalance",
    "cardBalance",
    "amount",
  ]) {
    const value = readNumber(xml, tag);
    if (value !== null) return value;
  }
  return null;
}

function readGiftcardCardNumber(xml: string): string | null {
  for (const tag of ["cardNumber", "giftcardNumber", "barcode"]) {
    const value = readText(xml, tag)?.trim();
    if (value) return value;
  }
  return null;
}

function readHistoryBalanceCents(entry: string): number | null {
  for (const tag of [
    "balanceAfterBooking",
    "balance",
    "saldo",
    "remainingBalance",
    "currentBalance",
  ]) {
    const value = readNumber(entry, tag);
    if (value !== null) return value;
  }
  return null;
}

function parseGiftcard(xml: string): MplusGiftcard | null {
  const body = stripNamespaces(extractSoapBody(xml));
  const errorMessage = readText(body, "errorMessage");
  const result = readText(body, "result");
  if (result && /NOT_?FOUND|ERROR|FAIL/i.test(result)) {
    return null;
  }

  const giftcardXml =
    readAllBlocks(body, "giftcard")[0] ??
    readAllBlocks(body, "GetGiftcard")[0] ??
    readAllBlocks(body, "GetGiftcardResponse")[0] ??
    readAllBlocks(body, "getGiftcardResponse")[0] ??
    null;

  const sourceXml = giftcardXml ?? body;
  const cardNumber = readGiftcardCardNumber(sourceXml) ?? readGiftcardCardNumber(body);
  const cardId = readText(sourceXml, "cardId") ?? readText(body, "cardId");
  const hasCardIdentity = Boolean(cardNumber) || Boolean(cardId);

  if (!hasCardIdentity) {
    if (errorMessage) return null;
    return null;
  }

  const currentBalanceCents =
    readGiftcardBalanceCents(sourceXml) ?? readGiftcardBalanceCents(body);
  if (currentBalanceCents === null) return null;

  return {
    cardId: cardId ?? "",
    cardNumber: cardNumber ?? "",
    active: readBoolean(sourceXml, "active") ?? readBoolean(body, "active") ?? false,
    currentBalanceCents,
    currentBalanceEur: centsToEur(currentBalanceCents),
    cardTypeId: readText(sourceXml, "cardTypeId") ?? readText(body, "cardTypeId") ?? "",
    validUntil: readText(sourceXml, "validUntil") ?? readText(body, "validUntil"),
  };
}

function parseGiftcardHistory(xml: string): MplusGiftcardHistoryEntry[] {
  const body = stripNamespaces(extractSoapBody(xml));
  const entryBlocks = [
    ...readAllBlocks(body, "giftcardHistory"),
    ...readAllBlocks(body, "GiftcardHistory"),
  ];
  return entryBlocks.map((entry) => {
    const bookingAmountCents = readNumber(entry, "bookingAmount") ?? 0;
    const balanceAfterBookingCents = readHistoryBalanceCents(entry);
    return {
      bookingAmountCents,
      bookingAmountEur: centsToEur(bookingAmountCents),
      balanceAfterBookingCents,
      balanceAfterBookingEur:
        balanceAfterBookingCents === null
          ? null
          : centsToEur(balanceAfterBookingCents),
      result: readText(entry, "result") ?? "UNKNOWN",
      dateTime: readText(entry, "dateTime"),
      bookDate: readText(entry, "bookDate"),
      externalReference: readText(entry, "externalReference"),
    };
  });
}

function parseGiftcardTypes(xml: string): MplusGiftcardType[] {
  const body = stripNamespaces(extractSoapBody(xml));
  return readAllBlocks(body, "giftcardTypes").map((typeXml) => ({
    cardTypeId: readText(typeXml, "cardTypeId") ?? "",
    name: readText(typeXml, "name") ?? "",
    reloadable: readBoolean(typeXml, "reloadable") ?? false,
    redeemable: readBoolean(typeXml, "redeemable") ?? false,
  }));
}

export async function getGiftcard(
  cardNumber: string,
): Promise<MplusGiftcard | null> {
  const credentials = getMplusCredentials();
  if (!credentials) return null;

  const trimmed = cardNumber.trim();
  if (!trimmed) return null;

  try {
    const xml = await mplusSoapCall(
      "getGiftcard",
      {
        request: {
          cardNumber: trimmed,
        },
      },
      credentials,
    );
    return parseGiftcard(xml);
  } catch (error) {
    if (error instanceof MplusApiError) {
      throw error;
    }
    console.error("[mplus] getGiftcard failed", {
      cardNumber: trimmed,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getGiftcardHistory(
  cardNumber: string,
): Promise<MplusGiftcardHistoryEntry[]> {
  const credentials = getMplusCredentials();
  if (!credentials) return [];

  const trimmed = cardNumber.trim();
  if (!trimmed) return [];

  try {
    const xml = await mplusSoapCall(
      "getGiftcardHistory",
      {
        request: {
          cardNumber: trimmed,
        },
      },
      credentials,
    );
    return parseGiftcardHistory(xml);
  } catch (error) {
    if (error instanceof MplusApiError) {
      throw error;
    }
    console.error("[mplus] getGiftcardHistory failed", {
      cardNumber: trimmed,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getGiftcardTypes(
  forceRefresh = false,
): Promise<MplusGiftcardType[]> {
  const credentials = getMplusCredentials();
  if (!credentials) return [];

  if (
    !forceRefresh &&
    giftcardTypesCache &&
    Date.now() - giftcardTypesCache.fetchedAt < GIFT_CARD_TYPES_TTL_MS
  ) {
    return giftcardTypesCache.types;
  }

  try {
    const xml = await mplusSoapCall(
      "getGiftcardTypes",
      {
        request: {
          branchNumber: credentials.branchNumber,
        },
      },
      credentials,
    );
    const types = parseGiftcardTypes(xml);
    giftcardTypesCache = { fetchedAt: Date.now(), types };
    return types;
  } catch (error) {
    console.error("[mplus] getGiftcardTypes failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return giftcardTypesCache?.types ?? [];
  }
}

export function findWoofWalletGiftcardType(
  types: MplusGiftcardType[],
): MplusGiftcardType | null {
  const normalized = types.filter((type) => !type.name.toLowerCase().includes("deleted"));
  return (
    normalized.find((type) => /woof\s*wallet/i.test(type.name)) ??
    normalized.find((type) => /wallet/i.test(type.name)) ??
    null
  );
}

export type CreateGiftcardInput = {
  cardTypeId: string;
  branchNumber: number;
  employeeNumber: number;
  amountCents?: number;
  externalReference: string;
  relationNumber?: number;
  cardNumber?: string;
};

export type CreateGiftcardResult =
  | { ok: true; cardNumber: string; cardId?: string }
  | { ok: false; reason: "not_configured" | "api_error" };

function parseCreateGiftcardResult(xml: string): CreateGiftcardResult {
  const body = stripNamespaces(extractSoapBody(xml));
  const result = readText(body, "result");
  if (result && !result.includes("OK")) {
    const errorMessage = readText(body, "errorMessage");
    console.error("[mplus] createGiftcard rejected", { result, errorMessage });
    return { ok: false, reason: "api_error" };
  }

  const giftcardXml =
    readAllBlocks(body, "giftcard")[0] ?? readAllBlocks(body, "CreateGiftcard")[0];
  if (giftcardXml) {
    const cardNumber = readText(giftcardXml, "cardNumber");
    if (cardNumber) {
      return {
        ok: true,
        cardNumber,
        cardId: readText(giftcardXml, "cardId") ?? undefined,
      };
    }
  }

  const cardNumber = readText(body, "cardNumber");
  if (cardNumber) {
    return { ok: true, cardNumber, cardId: readText(body, "cardId") ?? undefined };
  }

  return { ok: false, reason: "api_error" };
}

export async function createGiftcard(
  input: CreateGiftcardInput,
): Promise<CreateGiftcardResult> {
  const credentials = getMplusCredentials();
  if (!credentials) return { ok: false, reason: "not_configured" };

  const request: Record<string, unknown> = {
    cardTypeId: input.cardTypeId,
    branchNumber: input.branchNumber,
    employeeNumber: input.employeeNumber,
    amount: input.amountCents ?? 0,
    externalReference: input.externalReference,
  };
  if (input.cardNumber?.trim()) {
    request.cardNumber = input.cardNumber.trim();
  }
  if (input.relationNumber) {
    request.relationNumber = input.relationNumber;
  }

  try {
    const xml = await mplusSoapCall(
      "createGiftcard",
      { request },
      credentials,
    );
    return parseCreateGiftcardResult(xml);
  } catch (error) {
    console.error("[mplus] createGiftcard failed", {
      externalReference: input.externalReference,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "api_error" };
  }
}
