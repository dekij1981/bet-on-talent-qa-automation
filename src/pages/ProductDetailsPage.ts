import { expect, type Locator, type Page } from '@playwright/test';

export class ProductDetailsPage {
  readonly page: Page;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;
  readonly addedHeading: Locator;
  readonly addedMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.quantityInput = page.locator('#quantity');

    this.addToCartButton = page.getByRole('button', {
      name: 'Add to cart',
    });

    this.addedHeading = page.getByRole('heading', {
      name: 'Added!',
    });

    this.addedMessage = page.getByText('Your product has been added to cart.', {
      exact: true,
    });
  }

  async expectProductDetails(name: string, price: string, availability: string): Promise<void> {
    await expect(
      this.page.getByRole('heading', {
        name,
      }),
    ).toBeVisible();

    await expect(
      this.page.getByText(price, {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      this.page.getByText(availability, {
        exact: true,
      }),
    ).toBeVisible();
  }

  async expectDefaultQuantity(): Promise<void> {
    await expect(this.quantityInput).toHaveValue('1');
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  async expectQuantity(quantity: number): Promise<void> {
    await expect(this.quantityInput).toHaveValue(String(quantity));
  }

  async expectAddToCartAvailable(): Promise<void> {
    await expect(this.addToCartButton).toBeVisible();
    await expect(this.addToCartButton).toBeEnabled();
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async expectAddedToCart(): Promise<void> {
    await expect(this.addedHeading).toBeVisible();
    await expect(this.addedMessage).toBeVisible();
  }
}
