import { redirect } from "next/navigation";

export default function ManualReceiptPage() {
  redirect("/receipts/scan");
}
