import { expect, type Locator, type Page } from '@playwright/test';
import type { UserData } from '../data/user';

export class AccountInfoPage {
  readonly page: Page;
  readonly heading: Locator;

  readonly mrTitleRadio: Locator;
  readonly passwordInput: Locator;

  readonly daySelect: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;

  readonly newsletterCheckbox: Locator;
  readonly specialOffersCheckbox: Locator;

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly companyInput: Locator;
  readonly addressInput: Locator;
  readonly address2Input: Locator;
  readonly countrySelect: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;

  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      name: 'Enter Account Information',
    });

    this.mrTitleRadio = page.locator('input[name="title"][value="Mr"]');

    this.passwordInput = page.locator('[name="password"]');

    this.daySelect = page.locator('[name="days"]');
    this.monthSelect = page.locator('[name="months"]');
    this.yearSelect = page.locator('[name="years"]');

    this.newsletterCheckbox = page.locator('[name="newsletter"]');

    this.specialOffersCheckbox = page.locator('[name="optin"]');

    this.firstNameInput = page.locator('[name="first_name"]');

    this.lastNameInput = page.locator('[name="last_name"]');

    this.companyInput = page.locator('[name="company"]');

    this.addressInput = page.locator('[name="address1"]');

    this.address2Input = page.locator('[name="address2"]');

    this.countrySelect = page.locator('[name="country"]');

    this.stateInput = page.locator('[name="state"]');

    this.cityInput = page.locator('[name="city"]');

    this.zipcodeInput = page.locator('[name="zipcode"]');

    this.mobileNumberInput = page.locator('[name="mobile_number"]');

    this.createAccountButton = page.getByRole('button', {
      name: 'Create Account',
    });
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async fillAccountDetails(user: UserData): Promise<void> {
    await this.mrTitleRadio.check();

    await this.passwordInput.fill(user.password);

    await this.daySelect.selectOption(user.day);
    await this.monthSelect.selectOption(user.month);
    await this.yearSelect.selectOption(user.year);

    await this.newsletterCheckbox.check();
    await this.specialOffersCheckbox.check();

    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.companyInput.fill(user.company);
    await this.addressInput.fill(user.address);
    await this.address2Input.fill(user.address2);

    await this.countrySelect.selectOption({
      label: user.country,
    });

    await this.stateInput.fill(user.state);
    await this.cityInput.fill(user.city);
    await this.zipcodeInput.fill(user.zipcode);
    await this.mobileNumberInput.fill(user.mobileNumber);
  }

  async createAccount(): Promise<void> {
    await this.createAccountButton.click();
  }
}
