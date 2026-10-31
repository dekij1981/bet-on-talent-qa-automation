import { expect, type Locator, type Page, type Response } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly allProductsHeading: Locator;
  readonly searchedProductsHeading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  /** Product cards in the results section (not the hidden cart modal or sidebar). */
  readonly resultCards: Locator;
  /** Each card renders its name twice (card + hover overlay); .productinfo is the visible one. */
  readonly resultNames: Locator;
  readonly viewProductLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    this.allProductsHeading = page.getByRole('heading', { name: 'All Products', exact: true });
    this.searchedProductsHeading = page.getByRole('heading', {
      name: 'Searched Products',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Search Product');
    // Icon-only button without an accessible name, so the id is the best hook.
    this.searchButton = page.locator('#submit_search');

    this.resultCards = page.locator('.features_items .product-image-wrapper');
    this.resultNames = this.resultCards.locator('.productinfo p');
    this.viewProductLinks = this.resultCards.getByRole('link', { name: 'View Product' });
  }

  async open(): Promise<void> {
    await this.page.goto('/products');
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.allProductsHeading).toBeVisible();
  }

  /**
   * Searches through the UI and returns the response of the results page.
   *
   * Waits for the next main-frame navigation and its load event, whatever the new URL is. The
   * site builds the URL itself (unencoded, untrimmed: DEF-03, DEF-04), so a fix that changes the
   * URL must still reach the result assertions instead of timing out here. Both waits are
   * registered before the click, so the previous page is never mistaken for the result.
   */
  async search(term: string): Promise<Response> {
    const mainFrame = this.page.mainFrame();
    await this.searchInput.fill(term);

    // One Promise.all: if the click fails, no pending wait is left unhandled.
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.request().isNavigationRequest() && res.frame() === mainFrame,
      ),
      this.page.waitForEvent('framenavigated', { predicate: (frame) => frame === mainFrame }),
      this.searchButton.click(),
    ]);
    await this.page.waitForLoadState('load');
    return response;
  }

  /**
   * Presses Enter in the search field and checks that no navigation follows. "Nothing happens"
   * can only be observed over time, so the wait is bounded; any error other than that timeout
   * (for example a failed fill) is rethrown and stays a real failure.
   */
  async pressEnterAndExpectNoSearch(
    term: string,
    message: string,
    observeMs = 3_000,
  ): Promise<void> {
    const mainFrame = this.page.mainFrame();
    await this.searchInput.fill(term);
    const navigation = this.page
      .waitForEvent('framenavigated', {
        predicate: (frame) => frame === mainFrame,
        timeout: observeMs,
      })
      .then(
        () => 'navigated' as const,
        (error: Error) => {
          if (error.name === 'TimeoutError') return 'stayed' as const;
          throw error;
        },
      );
    await this.searchInput.press('Enter');
    expect(await navigation, message).toBe('stayed');
    await expect(this.searchedProductsHeading, message).toBeHidden();
  }

  card(name: string): Locator {
    return this.resultCards.filter({
      has: this.page.locator('.productinfo p').getByText(name, { exact: true }),
    });
  }

  async resultNameList(): Promise<string[]> {
    return (await this.resultNames.allTextContents()).map((name) => name.trim());
  }

  /** Name, price and link of every result card, read once the results page has loaded. */
  async resultCardsSummary(): Promise<{ name: string; price: string; href: string }[]> {
    return this.resultCards.evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.querySelector('.productinfo p')?.textContent?.trim() ?? '',
        price: card.querySelector('.productinfo h2')?.textContent?.trim() ?? '',
        href: card.querySelector('a[href^="/product_details/"]')?.getAttribute('href') ?? '',
      })),
    );
  }

  async expectSearchResults(): Promise<void> {
    await expect(this.searchedProductsHeading).toBeVisible();
  }

  async expectProductInResults(name: string, price: string): Promise<void> {
    await expect(this.card(name)).toBeVisible();
    await expect(this.card(name).locator('.productinfo h2')).toHaveText(price);
  }

  async openProduct(name: string): Promise<void> {
    await this.card(name).getByRole('link', { name: 'View Product' }).click();

    // waitForURL waits for the load event: cart.js binds "Add to cart" at the end of <body>,
    // so clicking it before load does nothing.
    await this.page.waitForURL(/\/product_details\/\d+$/);
  }
}
