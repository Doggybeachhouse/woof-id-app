import { getWordPressStoreUrl } from "@/lib/wordpress/client";

export function getWoofWalletAccountUrl() {
  return `${getWordPressStoreUrl()}/my-account/woof-wallet-account/`;
}
