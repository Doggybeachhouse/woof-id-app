import { handleMplusWebhook } from "@/lib/mplus/webhook/handleWebhook";
import { processAddSessionLineWebhook } from "@/lib/mplus/webhook/processAddSessionLine";

export async function POST(req: Request) {
  return handleMplusWebhook(req, processAddSessionLineWebhook, "addSessionLine");
}
