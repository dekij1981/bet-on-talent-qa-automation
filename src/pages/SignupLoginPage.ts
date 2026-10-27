import { expect, type Locator, type Page } from '@playwright/test';

export class SignupLoginPage {
  readonly page: Page;
  readonly signupForm: Locator;
  readonly signupHeading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly signupButton: Locator;
  readonly existingEmailError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.signupHeading = page.getByRole('heading', {
      name: 'New User Signup!',
    });

    this.signupForm = page.locator('form').filter({
      has: page.getByRole('button', {
        name: 'Signup',
        exact: true,
      }),
    });

    this.nameInput = this.signupForm.getByPlaceholder('Name');

    this.emailInput =
      this.signupForm.getByPlaceholder('Email Address');

    this.signupButton = this.signupForm.getByRole('button', {
      name: 'Signup',
      exact: true,
    });

    this.existingEmailError = this.signupForm.getByText(
      'Email Address already exist!',
      {
        exact: true,
      },
    );
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.signupHeading).toBeVisible();
  }

  async startSignup(name: string, email: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.signupButton.click();
  }

  async expectExistingEmailError(): Promise<void> {
    await expect(this.existingEmailError).toBeVisible();
  }
}