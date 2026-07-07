export type MplusReceiptLine = {
  name: string;
  quantity: number;
  articleNumber?: string;
};

export type MplusReceiptResult = {
  barcode: string;
  lines: MplusReceiptLine[];
};

/** STN/Mplus API — returns null until credentials are configured. */
export async function lookupReceiptByBarcode(
  barcode: string,
): Promise<MplusReceiptResult | null> {
  const url = process.env.MPLUS_API_URL;
  const ident = process.env.MPLUS_IDENT;
  const secret = process.env.MPLUS_SECRET;
  if (!url || !ident || !secret) {
    return null;
  }

  // TODO: SOAP getReceipts / getOrder when STN delivers credentials
  void barcode;
  return null;
}
