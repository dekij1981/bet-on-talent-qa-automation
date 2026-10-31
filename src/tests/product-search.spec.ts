import type { ApiClient, ApiProduct } from '../api/ApiClient';
import {
  caseVariants,
  formatPrice,
  parsePrice,
  primaryProduct as product,
  searchData,
} from '../data/products';
import { uniqueId } from '../data/users';
import { expect, test } from '../fixtures';
import type { ProductsPage } from '../pages/ProductsPage';

// Spec: docs/test-cases/product-search.md
// Every test runs in a fresh browser context, so the cart always starts empty.
// Known-defect tests call test.fail() only after their setup and preconditions passed, so a
// broken setup is reported as a real failure, not as the expected one.

/** Search rule confirmed during exploration: case-insensitive substring of name or category. */
function matchesSearch(item: ApiProduct, term: string): boolean {
  const needle = term.toLowerCase();
  return (
    item.name.toLowerCase().includes(needle) ||
    item.category.category.toLowerCase().includes(needle)
  );
}

/**
 * The UI and the search API each return exactly the products the search rule selects from the
 * full catalogue. The expected set does not come from the search under test, so a product that
 * both of them omit is caught. Order is not part of the contract, so identities are compared sorted.
 */
async function expectResultsMatchCatalogue(
  apiClient: ApiClient,
  productsPage: ProductsPage,
  term: string,
): Promise<string[]> {
  const expected = (await apiClient.productsList())
    .filter((item) => matchesSearch(item, term))
    .map((item) => item.name)
    .sort();
  const fromApi = (await apiClient.searchProduct(term)).map((item) => item.name).sort();
  expect(fromApi, `search API results for "${term}"`).toEqual(expected);

  await expect(productsPage.resultCards).toHaveCount(expected.length);
  const fromUi = [...(await productsPage.resultNameList())].sort();
  expect(fromUi, `UI results for "${term}"`).toEqual(expected);
  return expected;
}

async function productIdByName(apiClient: ApiClient, name: string): Promise<number> {
  const match = (await apiClient.searchProduct(name)).find((item) => item.name === name);
  if (!match) throw new Error(`Product "${name}" not found through the API`);
  return match.id;
}

/** Up to `size` items spread evenly over the list, always including the first and the last. */
function evenlySpaced<T>(items: T[], size: number): T[] {
  if (items.length <= size) return items;
  if (size === 1) return [items[0]];
  return Array.from(
    { length: size },
    (_, i) => items[Math.round((i * (items.length - 1)) / (size - 1))],
  );
}

test.describe('Product search', () => {
  test(
    'TC-SEARCH-001 Search for a known product and add it to the cart',
    { tag: ['@smoke', '@search'] },
    async ({ apiClient, productsPage, productDetailsPage, cartPage }) => {
      await productsPage.open();
      await productsPage.expectToBeLoaded();

      await productsPage.search(product.searchTerm);
      await productsPage.expectSearchResults();
      await expectResultsMatchCatalogue(apiClient, productsPage, product.searchTerm);
      await productsPage.expectProductInResults(product.name, product.price);

      await productsPage.openProduct(product.name);
      await productDetailsPage.expectProduct(product);
      await productDetailsPage.expectQuantityAndAddToCartUsable();

      await productDetailsPage.setQuantity(product.quantity);
      await productDetailsPage.addToCart();
      await productDetailsPage.expectAddedModal();

      await productDetailsPage.viewCart();
      await cartPage.expectLine(
        product.name,
        product.quantity,
        formatPrice(parsePrice(product.price) * product.quantity),
      );
    },
  );

  test(
    'TC-SEARCH-002 Search with no matching products',
    { tag: ['@smoke', '@search'] },
    async ({ productsPage }) => {
      await productsPage.open();

      const response = await productsPage.search(`non-existing-product-${uniqueId()}`);

      expect(response.status(), 'no server error').toBeLessThan(400);
      await productsPage.expectSearchResults();
      await expect(productsPage.resultCards).toHaveCount(0);
      await expect(productsPage.searchInput, 'page stays usable').toBeEditable();
    },
  );

  for (const term of searchData.partialTerms) {
    test(
      `TC-SEARCH-003 Search using a partial product name: "${term}"`,
      { tag: ['@regression', '@search'] },
      async ({ apiClient, productsPage }) => {
        await productsPage.open();
        await productsPage.search(term);

        const expected = await expectResultsMatchCatalogue(apiClient, productsPage, term);
        expect(expected.length, `"${term}" returns several products`).toBeGreaterThan(1);
      },
    );
  }

  for (const term of caseVariants(product.searchTerm)) {
    test(
      `TC-SEARCH-004 Search is case-insensitive: "${term}"`,
      { tag: ['@regression', '@search'] },
      async ({ productsPage }) => {
        await productsPage.open();
        await productsPage.search(product.searchTerm);
        const baseline = await productsPage.resultNameList();
        expect(baseline.length).toBeGreaterThan(0);

        await productsPage.search(term);

        await expect(productsPage.resultNames).toHaveText(baseline);
      },
    );
  }

  test(
    'TC-SEARCH-005 Empty search returns all products',
    { tag: ['@regression', '@search'] },
    async ({ apiClient, productsPage }) => {
      const catalogue = await apiClient.productsList();

      await productsPage.open();
      await productsPage.search('');

      await expect(productsPage.allProductsHeading).toBeVisible();
      await expect(productsPage.resultCards).toHaveCount(catalogue.length);
    },
  );

  test(
    'TC-SEARCH-006 Search results open the matching product page (sample)',
    { tag: ['@regression', '@search'] },
    async ({ page, productsPage, productDetailsPage }) => {
      await productsPage.open();
      await productsPage.search(searchData.detailPagesTerm);
      const cards = await productsPage.resultCardsSummary();
      expect(cards.length).toBeGreaterThan(1);

      // A bounded, evenly spread sample keeps the test's duration independent of catalogue size.
      for (const card of evenlySpaced(cards, searchData.detailPagesSampleSize)) {
        await test.step(card.name, async () => {
          await page.goto(card.href);
          // Soft: one broken link should not hide the others.
          await expect.soft(productDetailsPage.name).toHaveText(card.name);
          await expect.soft(productDetailsPage.price).toHaveText(card.price);
        });
      }
    },
  );

  for (const quantity of ['0', '-2']) {
    test(
      `TC-SEARCH-007 Quantity rejects zero and negative values: ${quantity}`,
      {
        tag: ['@regression', '@search', '@known-defect'],
        annotation: {
          type: 'issue',
          description: 'DEF-02: quantity -2 reduces the cart; 0 shows a false "Added!"',
        },
      },
      async ({ apiClient, productDetailsPage, cartPage }) => {
        const total = formatPrice(parsePrice(product.price) * product.quantity);
        const productId = await productIdByName(apiClient, product.name);

        // Precondition: the product is in the cart with the valid quantity.
        await productDetailsPage.open(productId);
        await productDetailsPage.addToCartAndContinue(product.quantity);
        await cartPage.open();
        await cartPage.expectLine(product.name, product.quantity, total);

        await productDetailsPage.open(productId);
        await productDetailsPage.setQuantity(quantity);

        test.fail(); // DEF-02 from here on
        await productDetailsPage.attemptAddToCart();
        await productDetailsPage.waitForCartRequests();

        // Correct behaviour. Today "Added!" is shown for both values and -2 reduces the cart.
        await expect
          .soft(productDetailsPage.addedHeading, 'invalid quantity is not confirmed')
          .toBeHidden();
        await cartPage.open();
        await cartPage.expectLine(product.name, product.quantity, total);
      },
    );
  }

  test(
    'TC-SEARCH-008 Leading spaces are ignored',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-03: leading spaces return no results' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.search(product.searchTerm);
      const baseline = await productsPage.resultNameList();
      expect(baseline.length, 'baseline search returns results').toBeGreaterThan(0);

      test.fail(); // DEF-03 from here on
      await productsPage.search(`  ${product.searchTerm}`);

      // Correct behaviour. Today the search returns 0 results.
      await expect(productsPage.resultNames).toHaveText(baseline);
    },
  );

  for (const term of searchData.ampersandTerms) {
    test(
      `TC-SEARCH-009 Search terms containing &: "${term}"`,
      {
        tag: ['@regression', '@search', '@known-defect'],
        annotation: {
          type: 'issue',
          description: 'DEF-04: search term is not URL-encoded, so & cuts it',
        },
      },
      async ({ apiClient, productsPage }) => {
        // Oracle from the full catalogue, so it does not depend on the search under test.
        const expected = (await apiClient.productsList())
          .filter((item) => matchesSearch(item, term))
          .map((item) => item.name);
        expect(expected, `catalogue has exactly one match for "${term}"`).toHaveLength(1);
        await productsPage.open();

        test.fail(); // DEF-04 from here on
        await productsPage.search(term);

        // Correct behaviour. Today unrelated products are returned.
        await expect(productsPage.resultNames).toHaveText(expected);
      },
    );
  }

  for (const term of ['<script>alert(1)</script>', "' OR '1'='1", '%']) {
    test(
      `TC-SEARCH-010 Script and SQL-like input is handled safely: ${term}`,
      { tag: ['@regression', '@search'] },
      async ({ page, productsPage }) => {
        const dialogs: string[] = [];
        page.on('dialog', async (dialog) => {
          dialogs.push(dialog.message());
          await dialog.dismiss();
        });

        await productsPage.open();
        const response = await productsPage.search(term);

        expect(response.status(), 'no server error').toBeLessThan(400);
        await productsPage.expectSearchResults();
        await expect(productsPage.resultCards).toHaveCount(0);
        expect(dialogs, 'input was not executed').toEqual([]);
      },
    );
  }

  test(
    'TC-SEARCH-011 Pressing Enter submits the search',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-05: Enter does not submit the search' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.expectToBeLoaded();

      test.fail(); // DEF-05 from here on
      await productsPage.pressEnterToSearch(product.searchTerm);

      // Correct behaviour. Today nothing happens.
      await productsPage.expectSearchResults();
    },
  );
});
