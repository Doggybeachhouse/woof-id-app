import { mplusSoapCall } from "@/lib/mplus/client";
import { getMplusCredentials, isMplusKassaAutoSyncEnabled } from "@/lib/mplus/config";
import {
  extractSoapBody,
  readAllBlocks,
  readNumber,
  readText,
  stripNamespaces,
} from "@/lib/mplus/xml";

export type MplusRelation = {
  relationNumber: number;
  name?: string | null;
  email?: string | null;
  extRelationId?: string | null;
};

function parseRelationXml(relationXml: string): MplusRelation | null {
  const relationNumber = readNumber(relationXml, "relationNumber");
  if (relationNumber === null) return null;
  return {
    relationNumber,
    name: readText(relationXml, "name"),
    email: readText(relationXml, "email"),
    extRelationId: readText(relationXml, "extRelationId"),
  };
}

function parseFindRelationResult(xml: string): MplusRelation | null {
  const body = stripNamespaces(extractSoapBody(xml));
  const result = readText(body, "result");
  if (result && result !== "FIND-RELATION-RESULT-OK") return null;

  const relationXml = readAllBlocks(body, "relation")[0];
  if (!relationXml) return null;
  return parseRelationXml(relationXml);
}

function parseCreateRelationResult(xml: string): number | null {
  const body = stripNamespaces(extractSoapBody(xml));
  const result = readText(body, "result");
  if (result && result !== "CREATE-RELATION-RESULT-OK") return null;
  return readNumber(body, "relationNumber");
}

export async function findMplusRelationByEmail(
  email: string,
): Promise<MplusRelation | null> {
  const credentials = getMplusCredentials();
  if (!credentials) return null;

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const xml = await mplusSoapCall(
      "findRelation",
      {
        relation: {
          email: trimmed,
        },
      },
      credentials,
    );
    return parseFindRelationResult(xml);
  } catch (error) {
    console.error("[mplus] findRelation failed", {
      email: trimmed,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function createMplusRelation(input: {
  name: string;
  email: string;
  contact?: string;
  extRelationId?: string;
  extraText?: string;
}): Promise<number | null> {
  const credentials = getMplusCredentials();
  if (!credentials) return null;

  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  try {
    const xml = await mplusSoapCall(
      "createRelation",
      {
        relation: {
          name: input.name.trim() || email,
          email,
          contact: input.contact?.trim() || input.name.trim() || email,
          ...(input.extRelationId ? { extRelationId: input.extRelationId } : {}),
          ...(input.extraText ? { extraText: input.extraText } : {}),
        },
      },
      credentials,
    );
    return parseCreateRelationResult(xml);
  } catch (error) {
    console.error("[mplus] createRelation failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function findOrCreateMplusRelation(input: {
  userId: string;
  name?: string | null;
  email: string;
  extraText?: string;
}): Promise<number | null> {
  if (!isMplusKassaAutoSyncEnabled()) return null;

  const existing = await findMplusRelationByEmail(input.email);
  if (existing) return existing.relationNumber;

  return createMplusRelation({
    name: input.name?.trim() || input.email,
    email: input.email,
    contact: input.name?.trim() || undefined,
    extRelationId: input.userId,
    extraText: input.extraText,
  });
}

export async function updateMplusRelationExtraText(
  relationNumber: number,
  extraText: string,
): Promise<boolean> {
  const credentials = getMplusCredentials();
  if (!credentials) return false;

  try {
    await mplusSoapCall(
      "updateRelation",
      {
        relation: {
          relationNumber,
          extraText,
        },
      },
      credentials,
    );
    return true;
  } catch (error) {
    console.error("[mplus] updateRelation failed", {
      relationNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function isMplusRelationSyncAvailable(): boolean {
  return isMplusKassaAutoSyncEnabled();
}
