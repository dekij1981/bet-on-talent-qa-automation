import { readInt, readString } from '../config/env';

export type ProductExpectation = {
  searchTerm: string;
  name: string;
  price: string;
  availability: string;
  quantity: number;
};

/** Main search-to-cart product. Every value can be overridden through .env. */
export const primaryProduct: ProductExpectation = {
  searchTerm: readString('PRODUCT_SEARCH_TERM', 'Blue Top'),
  name: readString('PRODUCT_NAME', 'Blue Top'),
  price: readString('PRODUCT_PRICE', 'Rs. 500'),
  availability: readString('PRODUCT_AVAILABILITY', 'In Stock'),
  quantity: readInt('PRODUCT_QUANTITY', 3, 1),
};

/** "Rs. 500" → 500 */
export function parsePrice(price: string): number {
  const amount = Number(price.replace(/[^\d]/g, ''));
  if (!amount) throw new Error(`Cannot parse price "${price}"`);
  return amount;
}

/** 1500 → "Rs. 1500", the format the site uses everywhere. */
export function formatPrice(amount: number): string {
  return `Rs. ${amount}`;
}
