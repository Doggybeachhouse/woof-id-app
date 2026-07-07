import { redirect } from "next/navigation";

export default function ManualReceiptRedirect() {
  redirect("/receipts/scan");
}
