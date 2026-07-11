export type MplusWebhookPayment = {
  amount?: number;
  description?: string;
  method?: string;
  cardNumber?: string;
  giftcardNumber?: string;
  giftCardNumber?: string;
  reference?: string;
  barcode?: string;
  externalReference?: string;
  paymentId?: string;
};

export type MplusWebhookLine = {
  lineId?: string;
  articleNumber?: number | string;
  priceIncl?: number;
  quantity?: number;
  text?: string;
  discountPercentage?: number;
  discountAmount?: number;
  barcode?: string;
  externalDiscount?: MplusExternalDiscount;
};

export type MplusExternalDiscount = {
  discountId?: string;
  discountDescription?: string;
  discountPercentage?: number;
  discountAmount?: number;
  discountType?: string;
  applyToQuantity?: number;
};

export type MplusWebhookSession = {
  sessionId?: string;
  totalInclAmount?: number;
  lines?: MplusWebhookLine[];
  relation?: {
    cardNumber?: string;
    name?: string;
  };
  payments?: MplusWebhookPayment[];
  invoice?: {
    invoiceId?: string;
    year?: number;
    number?: number;
  };
};

export type MplusCompleteSessionPayload = {
  event?: {
    eventBlocking?: boolean;
    eventCounter?: number;
    eventTimestamp?: string;
  };
  completeSession?: {
    payments?: MplusWebhookPayment[];
  };
  scanCode?: {
    scannedCode?: string;
    codeType?: string;
  };
  addSessionLine?: {
    line?: MplusWebhookLine;
  };
  sender?: {
    branchNumber?: number;
    workplaceNumber?: number;
    instanceId?: string;
  };
  session?: MplusWebhookSession;
  original?: MplusCompleteSessionPayload;
  error?: {
    code?: string;
    message?: string;
  };
};

export type MplusLineChange = {
  lineId: string;
  externalDiscount: {
    discountId: string;
    discountDescription: string;
    discountPercentage?: number;
    discountAmount?: number;
    discountType?: string;
    applyToQuantity?: number;
  };
};

export type MplusScanCodeResponse = {
  scanCode: {
    recognized: boolean;
    message?: string;
    customerMessage?: string;
    relationNumber?: number;
  };
  lineChanges?: MplusLineChange[];
};

export type MplusAddSessionLineResponse = {
  lineChanges?: MplusLineChange[];
};

export function unwrapMplusPayload(
  body: unknown,
): MplusCompleteSessionPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as MplusCompleteSessionPayload;
  if (record.original && typeof record.original === "object") {
    return record.original;
  }
  return record;
}
