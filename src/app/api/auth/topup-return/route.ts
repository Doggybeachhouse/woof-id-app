import { NextResponse } from "next/server";
import { z } from "zod";

import { validateTopUpReturnToken } from "@/lib/auth/topupReturnToken";

const bodySchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const validated = await validateTopUpReturnToken(parsed.data.token);
  if (!validated) {
    return NextResponse.json(
      { error: "Deze terugkeerlink is ongeldig of verlopen." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    email: validated.email,
    orderId: validated.orderId ?? null,
  });
}
