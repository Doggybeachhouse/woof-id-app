import { handleMplusWebhook } from "@/lib/mplus/webhook/handleWebhook";
import { processScanCodeWebhook } from "@/lib/mplus/webhook/processScanCode";

export async function POST(req: Request) {
  return handleMplusWebhook(req, processScanCodeWebhook, "scanCode");
}
