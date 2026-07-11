import {
  buildMplusRequestUrl,
  getMplusCredentials,
  type MplusCredentials,
} from "@/lib/mplus/config";
import { buildSoapEnvelope, extractSoapBody, readSoapFault, stripNamespaces } from "@/lib/mplus/xml";

export class MplusApiError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "network" | "soap_fault" | "http_error",
    readonly status?: number,
  ) {
    super(message);
    this.name = "MplusApiError";
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

export async function mplusSoapCall(
  operation: string,
  body: Record<string, unknown>,
  credentials: MplusCredentials = getMplusCredentials()!,
): Promise<string> {
  if (!credentials) {
    throw new MplusApiError("Mplus API is not configured", "not_configured");
  }

  const envelope = buildSoapEnvelope(operation, body);
  const url = buildMplusRequestUrl(credentials);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `urn:mplusqapi#${operation}`,
      },
      body: envelope,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach Mplus API";
    throw new MplusApiError(message, "network");
  }

  const xml = await response.text();
  const fault = readSoapFault(xml);
  if (fault && /<Fault>/i.test(stripNamespaces(extractSoapBody(xml)))) {
    throw new MplusApiError(fault, "soap_fault", response.status);
  }
  if (!response.ok) {
    throw new MplusApiError(
      fault ?? `Mplus API HTTP ${response.status}`,
      fault ? "soap_fault" : "http_error",
      response.status,
    );
  }

  return xml;
}
