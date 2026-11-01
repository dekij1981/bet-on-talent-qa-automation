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
// Known-defect tests assert the defect's observed symptom, not the correct behaviour. They are
// green while the symptom is exactly as documented and red for anything else: a broken setup, a
// changed locator, a failed cleanup, or a fixed defect. A fixed defect fails with a message that
// says so; the test is then replaced by a check of the correct behaviour (see docs/test-cases).

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
      // Same identities, not only the same count: a duplicate plus an omission would match a count.
      await expect(productsPage.resultCards).toHaveCount(catalogue.length);
      const shown = [...(await productsPage.resultNameList())].sort();
      expect(shown).toEqual(catalogue.map((item) => item.name).sort());
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

  // cartChange: what DEF-02 does to the cart quantity today.
  for (const { quantity, cartChange } of [
    { quantity: '0', cartChange: 0 },
    { quantity: '-2', cartChange: -2 },
  ]) {
    test(
      `TC-SEARCH-007 Quantity rejects zero and negative values (DEF-02 symptom): ${quantity}`,
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
        await productDetailsPage.attemptAddToCart();
        await productDetailsPage.waitForCartRequests();

        // DEF-02 symptom: the invalid quantity is confirmed with "Added!".
        await expect(
          productDetailsPage.addedHeading,
          `DEF-02 no longer reproduces for quantity ${quantity}: replace this test with a check that the quantity is rejected`,
        ).toBeVisible();
        // DEF-02 symptom: the cart quantity changed by the invalid value (0 leaves it as is).
        const symptomQuantity = product.quantity + cartChange;
        await cartPage.open();
        await cartPage.expectLine(
          product.name,
          symptomQuantity,
          formatPrice(parsePrice(product.price) * symptomQuantity),
        );
      },
    );
  }

  test(
    'TC-SEARCH-008 Leading spaces are ignored (DEF-03 symptom)',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-03: leading spaces return no results' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.search(product.searchTerm);
      const baseline = await productsPage.resultNameList();
      expect(baseline.length, 'baseline search returns results').toBeGreaterThan(0);

      await productsPage.search(`  ${product.searchTerm}`);

      // DEF-03 symptom: the search finishes normally but returns 0 results.
      await productsPage.expectSearchResults();
      await expect(
        productsPage.resultCards,
        'DEF-03 no longer reproduces: replace this test with a check that results equal the baseline',
      ).toHaveCount(0);
    },
  );

  for (const term of searchData.ampersandTerms) {
    test(
      `TC-SEARCH-009 Search terms containing & (DEF-04 symptom): "${term}"`,
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

        await productsPage.search(term);

        // DEF-04 symptom: the term is cut at "&", so products that do not match it are returned.
        await productsPage.expectSearchResults();
        const unrelated = (await productsPage.resultNameList()).filter(
          (name) => !expected.includes(name),
        );
        expect(
          unrelated,
          `DEF-04 no longer reproduces for "${term}": replace this test with a check that only ${expected[0]} is returned`,
        ).not.toEqual([]);
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
    'TC-SEARCH-011 Pressing Enter submits the search (DEF-05 symptom)',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-05: Enter does not submit the search' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.expectToBeLoaded();

      // DEF-05 symptom: nothing happens. If Enter starts a search, this fails as "fixed".
      await productsPage.pressEnterAndExpectNoSearch(
        product.searchTerm,
        'DEF-05 no longer reproduces: replace this test with a check that Enter shows the results',
      );
    },
  );
});
