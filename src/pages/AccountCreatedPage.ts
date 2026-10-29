import { expect, type Locator, type Page } from '@playwright/test';

export class AccountCreatedPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByTestId('account-created');
    this.continueButton = page.getByTestId('continue-button');
  }

  async expectAccountCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account_created$/);
    await expect(this.heading).toHaveText('Account Created!');
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
