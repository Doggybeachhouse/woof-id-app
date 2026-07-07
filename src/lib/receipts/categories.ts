import type { ProductCategory } from "@prisma/client";

export const PRODUCT_CATEGORY_OPTIONS: {
  value: ProductCategory;
  label: string;
}[] = [
  { value: "LICKY", label: "Licky / hondenijs" },
  { value: "SNACKS", label: "Snacks" },
  { value: "TOYS", label: "Speeltjes" },
  { value: "ACCESSORIES", label: "Accessoires" },
  { value: "GROOMING", label: "Verzorging" },
  { value: "CLOTHING", label: "Kleding" },
  { value: "OTHER", label: "Overig" },
];

export function parseProductCategory(value: string): ProductCategory {
  const upper = value.toUpperCase().trim();
  const valid = PRODUCT_CATEGORY_OPTIONS.map((o) => o.value);
  if (valid.includes(upper as ProductCategory)) {
    return upper as ProductCategory;
  }
  return "OTHER";
}
