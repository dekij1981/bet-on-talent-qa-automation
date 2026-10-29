import { expect, type Locator, type Page } from '@playwright/test';

import type { ProductExpectation } from '../data/products';

export class ProductDetailsPage {
  readonly page: Page;
  readonly name: Locator;
  readonly price: Locator;
  readonly availability: Locator;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;

  readonly cartModal: Locator;
  readonly addedHeading: Locator;
  readonly viewCartLink: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;

    const info = page.locator('.product-information');
    this.name = info.getByRole('heading', { level: 2 });
    this.price = info.getByText(/^Rs\. \d+$/);
    this.availability = info.getByRole('paragraph').filter({ hasText: 'Availability:' });
    // The "Quantity:" label is not linked to the input, so getByLabel cannot find it.
    this.quantityInput = page.locator('#quantity');
    this.addToCartButton = info.getByRole('button', { name: 'Add to cart' });

    this.cartModal = page.locator('#cartModal');
    this.addedHeading = this.cartModal.getByRole('heading', { name: 'Added!' });
    this.viewCartLink = this.cartModal.getByRole('link', { name: 'View Cart' });
    this.continueShoppingButton = this.cartModal.getByRole('button', {
      name: 'Continue Shopping',
    });
  }

  /** Direct navigation; goto waits for the load event, so the cart handler is bound. */
  async open(productId: number): Promise<void> {
    await this.page.goto(`/product_details/${productId}`);
  }

  async expectProduct(product: Pick<ProductExpectation, 'name' | 'price' | 'availability'>) {
    await expect(this.page).toHaveURL(/\/product_details\/\d+$/);
    await expect(this.name).toHaveText(product.name);
    await expect(this.price).toHaveText(product.price);
    await expect(this.availability).toHaveText(`Availability: ${product.availability}`);
  }

  async expectQuantityAndAddToCartUsable(): Promise<void> {
    await expect(this.quantityInput).toBeEditable();
    await expect(this.quantityInput).toHaveValue('1');
    await expect(this.addToCartButton).toBeEnabled();
  }

  async setQuantity(quantity: number | string): Promise<void> {
    await this.quantityInput.fill(String(quantity));
    await expect(this.quantityInput).toHaveValue(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async expectAddedModal(): Promise<void> {
    await expect(this.addedHeading).toBeVisible();
    await expect(this.viewCartLink).toBeVisible();
    await expect(this.continueShoppingButton).toBeVisible();
  }

  /** Adds the quantity and closes the confirmation modal. */
  async addToCartAndContinue(quantity: number | string): Promise<void> {
    await this.setQuantity(quantity);
    await this.addToCart();
    await this.expectAddedModal();
    await this.continueShoppingButton.click();
    await expect(this.cartModal).toBeHidden();
  }

  async viewCart(): Promise<void> {
    await this.viewCartLink.click();
  }
}
