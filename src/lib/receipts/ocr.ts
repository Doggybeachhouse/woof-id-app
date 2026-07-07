import { z } from "zod";

import { parseProductCategory } from "@/lib/receipts/categories";

const ocrProductSchema = z.object({
  rawName: z.string(),
  normalizedName: z.string(),
  quantity: z.number().int().positive().default(1),
  category: z.string(),
});

const ocrResponseSchema = z.object({
  products: z.array(ocrProductSchema),
});

export type OcrProduct = {
  rawName: string;
  normalizedName: string;
  quantity: number;
  category: ReturnType<typeof parseProductCategory>;
};

const SYSTEM_PROMPT = `Je bent een kassabon-assistent voor Doggy Beach House, een hondenwinkel in Zandvoort (Nederland).
Analyseer de bonfoto en herken alle gekochte producten.

Regels:
- Geef ALLEEN productregels, geen subtotalen, BTW, totaal of betaalwijze als aparte producten.
- quantity = het aantal stuks van dat product op de bon (minimaal 1).
- normalizedName = leesbare volledige productnaam (expandeer kassafkortingen waar mogelijk).
- rawName = exacte tekst zoals op de bon.
- category moet één van zijn: LICKY, SNACKS, TOYS, ACCESSORIES, GROOMING, CLOTHING, OTHER.
- LICKY = hondenijs (Licky, ijsje).
- SNACKS = snacks, treats, koekjes.
- TOYS = speeltjes, ballen, touwen.
- Prijzen zijn optioneel en niet nodig voor de output.

Voorbeelden producten in de winkel: Licky (verschillende smaken), Woofin, Cake Bix, hondensnacks, speeltjes.

Antwoord ALLEEN met geldig JSON in dit formaat:
{"products":[{"rawName":"...","normalizedName":"...","quantity":1,"category":"SNACKS"}]}`;

export async function recognizeReceiptProducts(
  imageBase64: string,
  mimeType: string,
): Promise<OcrProduct[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is niet geconfigureerd. Voeg deze toe aan .env om bonnen te scannen.",
    );
  }

  const model = process.env.OPENAI_RECEIPT_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Herken alle producten op deze Doggy Beach House kassabon. Focus op artikelen en hoeveelheden.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AI-herkenning mislukt (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Geen antwoord van AI ontvangen");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI-antwoord kon niet worden gelezen");
  }

  const result = ocrResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI gaf een ongeldig productoverzicht terug");
  }

  return result.data.products.map((p) => ({
    rawName: p.rawName.trim(),
    normalizedName: p.normalizedName.trim() || p.rawName.trim(),
    quantity: Math.max(1, Math.min(99, p.quantity)),
    category: parseProductCategory(p.category),
  }));
}
