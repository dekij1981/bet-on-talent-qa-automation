import { expect, type Locator, type Page } from '@playwright/test';

import { expectFieldInvalid } from './form-validation';

export class SignupLoginPage {
  readonly page: Page;
  readonly signupHeading: Locator;
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;
  readonly existingEmailError: Locator;

  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Both forms have an "Email Address" placeholder, so data-qa is the only unambiguous hook.
    this.signupHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.signupNameInput = page.getByTestId('signup-name');
    this.signupEmailInput = page.getByTestId('signup-email');
    this.signupButton = page.getByTestId('signup-button');
    this.existingEmailError = page
      .locator('form')
      .filter({ has: this.signupButton })
      .getByText('Email Address already exist!', { exact: true });

    this.loginEmailInput = page.getByTestId('login-email');
    this.loginPasswordInput = page.getByTestId('login-password');
    this.loginButton = page.getByTestId('login-button');
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.signupHeading).toBeVisible();
  }

  async startSignup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  async expectExistingEmailError(): Promise<void> {
    await expect(this.existingEmailError).toBeVisible();
    await expect(this.page).toHaveURL(/\/signup$/);
  }

  /** The browser blocked the signup submit: the field is invalid and we are still on /login. */
  async expectSignupBlockedBy(field: 'name' | 'email'): Promise<void> {
    await expectFieldInvalid(field === 'name' ? this.signupNameInput : this.signupEmailInput);
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.signupHeading).toBeVisible();
  }
}
