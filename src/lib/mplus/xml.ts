const NS = "urn:mplusqapi";

const ENVELOPE_OPEN = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${NS}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>`;

const ENVELOPE_CLOSE = `
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function serializeValue(value: unknown, indent: string): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number" || typeof value === "string") {
    return escapeXml(String(value));
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, indent)).join("");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([key, v]) => {
        const inner = serializeValue(v, `${indent}  `);
        if (inner === "") return "";
        return `\n${indent}  <ns:${key}>${inner}</ns:${key}>`;
      })
      .join("");
  }

  return "";
}

export function buildSoapEnvelope(
  operation: string,
  body: Record<string, unknown>,
): string {
  const inner = serializeValue(body, "    ");
  return `${ENVELOPE_OPEN}
    <ns:${operation}>${inner}
    </ns:${operation}>${ENVELOPE_CLOSE}`;
}

export function stripNamespaces(xml: string): string {
  return xml.replace(/<\/?(?:[\w-]+:)?/g, (match) =>
    match.startsWith("</") ? "</" : "<",
  );
}

export function readText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  return decodeXml(match[1].trim());
}

export function readAllBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function readNumber(xml: string, tag: string): number | null {
  const text = readText(xml, tag);
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function readBoolean(xml: string, tag: string): boolean | null {
  const text = readText(xml, tag);
  if (text === null) return null;
  return text === "true" || text === "1";
}

export function extractSoapBody(xml: string): string {
  const match = xml.match(/<Body>([\s\S]*?)<\/Body>/i);
  return match ? match[1] : xml;
}

export function readSoapFault(xml: string): string | null {
  const body = stripNamespaces(extractSoapBody(xml));
  return (
    readText(body, "faultstring") ??
    readText(body, "faultcode") ??
    readText(body, "errorMessage")
  );
}

export function toMplusDate(date: Date): { day: number; mon: number; year: number } {
  return {
    day: date.getDate(),
    mon: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function centsToEur(cents: number): number {
  return cents / 100;
}

export function mplusQuantity(quantity: number, decimalPlaces = 0): number {
  if (!decimalPlaces) return quantity;
  return quantity / 10 ** decimalPlaces;
}
