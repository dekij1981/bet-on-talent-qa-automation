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

  /** Searches through the UI and returns the response of the results page. */
  async search(term: string): Promise<Response> {
    // The click handler does window.location = '/products?search=' + term. Waiting for that
    // exact URL (and its load event) prevents reading the previous page's results.
    const expectedUrl = new URL(`/products?search=${term}`, this.page.url()).href;
    const response = this.page.waitForResponse(
      (res) => res.url() === expectedUrl && res.request().isNavigationRequest(),
    );

    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForURL((url) => url.href === expectedUrl);
    return response;
  }

  async pressEnterToSearch(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
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

  /** Every result name contains the term, ignoring case. */
  async expectAllNamesContain(term: string): Promise<void> {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = await this.resultNames.count();
    expect(count, `results for "${term}"`).toBeGreaterThan(0);
    await expect(this.resultNames).toHaveText(Array(count).fill(new RegExp(escaped, 'i')));
  }

  async openProduct(name: string): Promise<void> {
    await this.card(name).getByRole('link', { name: 'View Product' }).click();

    // waitForURL waits for the load event: cart.js binds "Add to cart" at the end of <body>,
    // so clicking it before load does nothing.
    await this.page.waitForURL(/\/product_details\/\d+$/);
  }
}
