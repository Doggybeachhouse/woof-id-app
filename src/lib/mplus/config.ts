export type MplusCredentials = {
  apiUrl: string;
  ident: string;
  secret: string;
  branchNumber: number;
  receiptLookbackDays: number;
  employeeNumber: number;
};

export function isMplusConfigured(): boolean {
  return getMplusCredentials() !== null;
}

export function getMplusCredentials(): MplusCredentials | null {
  const apiUrl = process.env.MPLUS_API_URL?.trim();
  const ident = process.env.MPLUS_IDENT?.trim();
  const secret = process.env.MPLUS_SECRET?.trim();
  if (!apiUrl || !ident || !secret) return null;

  const branchRaw = process.env.MPLUS_BRANCH_NUMBER?.trim();
  const branchNumber = branchRaw ? Number.parseInt(branchRaw, 10) : 1;
  const lookbackRaw = process.env.MPLUS_RECEIPT_LOOKBACK_DAYS?.trim();
  const receiptLookbackDays = lookbackRaw
    ? Number.parseInt(lookbackRaw, 10)
    : 30;

  const employeeRaw = process.env.MPLUS_EMPLOYEE_NUMBER?.trim();
  const employeeNumber = employeeRaw ? Number.parseInt(employeeRaw, 10) : 1;

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    ident,
    secret,
    branchNumber: Number.isFinite(branchNumber) && branchNumber > 0 ? branchNumber : 1,
    receiptLookbackDays:
      Number.isFinite(receiptLookbackDays) && receiptLookbackDays > 0
        ? receiptLookbackDays
        : 30,
    employeeNumber:
      Number.isFinite(employeeNumber) && employeeNumber > 0 ? employeeNumber : 1,
  };
}

/** Opt-in: create Mplus relations / wallets when users register or add dogs. */
export function isMplusKassaAutoSyncEnabled(): boolean {
  if (!isMplusConfigured()) return false;
  const raw = process.env.MPLUS_KASSA_AUTO_SYNC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function buildMplusRequestUrl(credentials: MplusCredentials): string {
  const url = new URL(credentials.apiUrl);
  url.searchParams.set("ident", credentials.ident);
  url.searchParams.set("secret", credentials.secret);
  return url.toString();
}
