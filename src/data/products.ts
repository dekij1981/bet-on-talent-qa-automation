import { testData } from './test-data';

export type ProductExpectation = {
  searchTerm: string;
  name: string;
  price: string;
  availability: string;
  quantity: number;
};

/** Main search-to-cart product (test data file and PRODUCT_* env vars, see test-data.ts). */
export const primaryProduct: ProductExpectation = testData.product;

/** Catalogue-dependent search inputs (test data file, see test-data.ts). */
export const searchData = testData.search;

/** Case variants of a term, e.g. "Blue Top" → "blue top", "BLUE TOP", "bLuE tOp". */
export function caseVariants(term: string): string[] {
  let letter = 0;
  const alternating = [...term]
    .map((char) => {
      if (char.toLowerCase() === char.toUpperCase()) return char;
      return letter++ % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
    })
    .join('');
  return [...new Set([term.toLowerCase(), term.toUpperCase(), alternating])];
}

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
