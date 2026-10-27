import { expect, type Locator, type Page } from '@playwright/test';

export class AccountCreatedPage {
  readonly heading: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', {
      name: 'Account Created!',
    });

    this.continueLink = page.getByRole('link', {
      name: 'Continue',
    });
  }

  async expectAccountCreated(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async continue(): Promise<void> {
    await this.continueLink.click();
  }
}
