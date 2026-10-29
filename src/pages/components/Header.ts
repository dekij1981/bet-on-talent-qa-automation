import { expect, type Locator, type Page } from '@playwright/test';

/** Site header, shared by every page. */
export class Header {
  readonly loggedInAs: Locator;
  readonly logoutLink: Locator;
  readonly deleteAccountLink: Locator;
  readonly signupLoginLink: Locator;

  constructor(page: Page) {
    const banner = page.getByRole('banner');

    this.loggedInAs = banner.getByRole('listitem').filter({ hasText: 'Logged in as' });
    this.logoutLink = banner.getByRole('link', { name: 'Logout' });
    this.deleteAccountLink = banner.getByRole('link', { name: 'Delete Account' });
    this.signupLoginLink = banner.getByRole('link', { name: 'Signup / Login' });
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async expectLoggedInAs(name: string): Promise<void> {
    await expect(this.loggedInAs).toHaveText(`Logged in as ${name}`);
    await expect(this.logoutLink).toBeVisible();
    await expect(this.deleteAccountLink).toBeVisible();
    await expect(this.signupLoginLink).toBeHidden();
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.signupLoginLink).toBeVisible();
    await expect(this.loggedInAs).toBeHidden();
  }
}
