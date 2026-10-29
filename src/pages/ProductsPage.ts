import { expect, type Locator, type Page } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchedProductsHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      name: 'All Products',
    });

    this.searchInput = page.getByPlaceholder('Search Product');

    this.searchButton = page.locator('#submit_search');

    this.searchedProductsHeading = page.getByRole('heading', {
      name: 'Searched Products',
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/products');
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async search(productName: string): Promise<void> {
    await this.searchInput.fill(productName);
    await this.searchButton.click();
  }

  async expectSearchResults(): Promise<void> {
    await expect(this.searchedProductsHeading).toBeVisible();
  }

  async expectProductInResults(productName: string): Promise<void> {
    const productCard = this.page.locator('.product-image-wrapper').filter({
      hasText: productName,
    });

    await expect(productCard).toBeVisible();
  }

  async openProduct(productName: string): Promise<void> {
    const productCard = this.page.locator('.product-image-wrapper').filter({
      hasText: productName,
    });

    await productCard
      .getByRole('link', {
        name: 'View Product',
      })
      .click();

    // waitForURL waits for the load event: cart.js binds "Add to cart" at the end of <body>,
    // so clicking it before load does nothing.
    await this.page.waitForURL(/\/product_details\/\d+$/);
  }
}
