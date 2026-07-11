/** Stable codes for client-side i18n (thrown as Error.message from server actions). */
export const RECEIPT_ERROR = {
  INVALID_INPUT: "RECEIPT_INVALID_INPUT",
  DUPLICATE: "RECEIPT_DUPLICATE",
  ALREADY_CLAIMED: "RECEIPT_ALREADY_CLAIMED",
  DAILY_LIMIT: "RECEIPT_DAILY_LIMIT",
  DOG_NOT_FOUND: "RECEIPT_DOG_NOT_FOUND",
} as const;

export type ReceiptErrorCode =
  (typeof RECEIPT_ERROR)[keyof typeof RECEIPT_ERROR];

export function isReceiptErrorCode(value: string): value is ReceiptErrorCode {
  return Object.values(RECEIPT_ERROR).includes(value as ReceiptErrorCode);
}

/** Maps stable server error codes to `errors.receipts.*` i18n keys. */
export const RECEIPT_ERROR_I18N_KEY: Record<ReceiptErrorCode, string> = {
  [RECEIPT_ERROR.INVALID_INPUT]: "selectDogAndBarcode",
  [RECEIPT_ERROR.DUPLICATE]: "duplicateBarcode",
  [RECEIPT_ERROR.ALREADY_CLAIMED]: "alreadyClaimed",
  [RECEIPT_ERROR.DAILY_LIMIT]: "dailyLimit",
  [RECEIPT_ERROR.DOG_NOT_FOUND]: "dogNotFound",
};

/** Secondary line shown for duplicate receipt scans. */
export const RECEIPT_ERROR_I18N_DETAIL_KEY: Partial<
  Record<ReceiptErrorCode, string>
> = {
  [RECEIPT_ERROR.DUPLICATE]: "duplicateBarcodeOtherDog",
  [RECEIPT_ERROR.ALREADY_CLAIMED]: "alreadyClaimedCoins",
};
