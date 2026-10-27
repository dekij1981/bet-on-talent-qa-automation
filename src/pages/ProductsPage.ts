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

    this.searchButton = page.getByRole('button', {
      name: 'Search Product',
    });

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
}
