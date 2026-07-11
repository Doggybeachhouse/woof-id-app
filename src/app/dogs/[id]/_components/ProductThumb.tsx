import type { ProductCategory } from "@prisma/client";

import {
  productCategoryEmoji,
  resolveProductImageUrl,
} from "@/lib/receipts/productImage";

type ProductThumbProps = {
  articleNumber: string | null;
  category: ProductCategory;
  name: string;
};

export function ProductThumb({ articleNumber, category, name }: ProductThumbProps) {
  const imageUrl = resolveProductImageUrl(articleNumber);
  const emoji = productCategoryEmoji(category);

  return (
    <div className="product-thumb shrink-0" aria-hidden>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="product-thumb__img" />
      ) : (
        <span className="product-thumb__placeholder">{emoji}</span>
      )}
      <span className="visually-hidden">{name}</span>
    </div>
  );
}
