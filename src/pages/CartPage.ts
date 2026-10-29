import { expect, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(): Promise<void> {
    await this.page.goto('/view_cart');
  }

  /** The cart is a real <table>; a line is the row that links to the product. */
  line(productName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: productName, exact: true }) });
  }

  quantityOf(productName: string): Locator {
    return this.line(productName).locator('.cart_quantity');
  }

  totalOf(productName: string): Locator {
    return this.line(productName).locator('.cart_total_price');
  }

  async expectLine(productName: string, quantity: number, total: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/view_cart$/);
    await expect(this.line(productName)).toHaveCount(1);
    await expect(this.quantityOf(productName)).toHaveText(String(quantity));
    await expect(this.totalOf(productName)).toHaveText(total);
  }
}
