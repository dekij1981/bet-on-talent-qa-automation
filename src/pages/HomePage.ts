import { expect, type Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoggedInAs(username: string): Promise<void> {
    await expect(
      this.page.getByText(`Logged in as ${username}`, {
        exact: true,
      }),
    ).toBeVisible();
  }
}