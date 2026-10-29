import type { ApiClient, ApiProduct } from '../api/ApiClient';
import { formatPrice, parsePrice, primaryProduct as product } from '../data/products';
import { uniqueId } from '../data/users';
import { expect, test } from '../fixtures';

// Spec: docs/test-cases/product-search.md
// Every test runs in a fresh browser context, so the cart always starts empty.

/** Search rule confirmed during exploration: case-insensitive substring of name or category. */
function matchesSearch(item: ApiProduct, term: string): boolean {
  const needle = term.toLowerCase();
  return (
    item.name.toLowerCase().includes(needle) ||
    item.category.category.toLowerCase().includes(needle)
  );
}

async function productIdByName(apiClient: ApiClient, name: string): Promise<number> {
  const match = (await apiClient.searchProduct(name)).find((item) => item.name === name);
  if (!match) throw new Error(`Product "${name}" not found through the API`);
  return match.id;
}

test.describe('Product search', () => {
  test(
    'TC-SEARCH-001 Search for a known product and add it to the cart',
    { tag: ['@smoke', '@search'] },
    async ({ productsPage, productDetailsPage, cartPage }) => {
      await productsPage.open();
      await productsPage.expectToBeLoaded();

      await productsPage.search(product.searchTerm);
      await productsPage.expectSearchResults();
      await productsPage.expectAllNamesContain(product.searchTerm);
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

  for (const term of ['top', 'jeans']) {
    test(
      `TC-SEARCH-003 Search using a partial product name: "${term}"`,
      { tag: ['@regression', '@search'] },
      async ({ apiClient, productsPage }) => {
        const expected = await apiClient.searchProduct(term);
        expect(expected.length, 'API oracle returns several products').toBeGreaterThan(1);
        for (const item of expected) {
          expect(matchesSearch(item, term), `"${item.name}" matches "${term}"`).toBe(true);
        }

        await productsPage.open();
        await productsPage.search(term);

        await expect(productsPage.resultNames).toHaveText(expected.map((item) => item.name));
      },
    );
  }

  for (const term of ['blue top', 'BLUE TOP', 'bLuE tOp']) {
    test(
      `TC-SEARCH-004 Search is case-insensitive: "${term}"`,
      { tag: ['@regression', '@search'] },
      async ({ productsPage }) => {
        await productsPage.open();
        await productsPage.search('Blue Top');
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
    'TC-SEARCH-006 Every result opens a matching product page',
    { tag: ['@regression', '@search'] },
    async ({ page, productsPage, productDetailsPage }) => {
      await productsPage.open();
      await productsPage.search('top');
      const cards = await productsPage.resultCardsSummary();
      expect(cards.length).toBeGreaterThan(1);

      for (const card of cards) {
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
    test.fail(
      `TC-SEARCH-007 Quantity rejects zero and negative values: ${quantity}`,
      {
        tag: ['@regression', '@search', '@known-defect'],
        annotation: {
          type: 'issue',
          description: 'DEF-02: quantity -2 reduces the cart; 0 shows a false "Added!"',
        },
      },
      async ({ apiClient, productDetailsPage, cartPage }) => {
        await productDetailsPage.open(await productIdByName(apiClient, product.name));
        await productDetailsPage.addToCartAndContinue(product.quantity);

        await productDetailsPage.setQuantity(quantity);
        await productDetailsPage.addToCart();
        await productDetailsPage.waitForCartRequests();

        // Correct behaviour. Today "Added!" is shown for both values and -2 reduces the cart.
        await expect
          .soft(productDetailsPage.addedHeading, 'invalid quantity is not confirmed')
          .toBeHidden();
        await cartPage.open();
        await cartPage.expectLine(
          product.name,
          product.quantity,
          formatPrice(parsePrice(product.price) * product.quantity),
        );
      },
    );
  }

  test.fail(
    'TC-SEARCH-008 Leading spaces are ignored',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-03: leading spaces return no results' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.search('Blue Top');
      const baseline = await productsPage.resultNameList();

      await productsPage.search('  Blue Top');

      // Correct behaviour. Today the search returns 0 results.
      await expect(productsPage.resultNames).toHaveText(baseline);
    },
  );

  for (const term of ['Fit & Flare', 'Blue & Pink']) {
    test.fail(
      `TC-SEARCH-009 Search terms containing & or #: "${term}"`,
      {
        tag: ['@regression', '@search', '@known-defect'],
        annotation: {
          type: 'issue',
          description: 'DEF-04: search term is not URL-encoded, so & and # break the search',
        },
      },
      async ({ apiClient, productsPage }) => {
        // Oracle from the full catalogue, so it does not depend on the search itself.
        const expected = (await apiClient.productsList())
          .filter((item) => matchesSearch(item, term))
          .map((item) => item.name);
        expect(expected, `catalogue contains "${term}"`).toHaveLength(1);

        await productsPage.open();
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

  test.fail(
    'TC-SEARCH-011 Pressing Enter submits the search',
    {
      tag: ['@regression', '@search', '@known-defect'],
      annotation: { type: 'issue', description: 'DEF-05: Enter does not submit the search' },
    },
    async ({ productsPage }) => {
      await productsPage.open();
      await productsPage.pressEnterToSearch(product.searchTerm);

      // Correct behaviour. Today nothing happens.
      await productsPage.expectSearchResults();
    },
  );
});
