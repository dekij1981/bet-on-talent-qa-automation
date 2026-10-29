import { expect, type Locator, type Page } from '@playwright/test';

import type { RequiredAccountField, UserData } from '../data/users';
import { expectFieldInvalid } from './form-validation';

export class AccountInfoPage {
  readonly page: Page;
  readonly heading: Locator;

  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly daySelect: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;
  readonly newsletterCheckbox: Locator;
  readonly specialOffersCheckbox: Locator;
  readonly companyInput: Locator;
  readonly address2Input: Locator;
  readonly countrySelect: Locator;
  readonly createAccountButton: Locator;

  /** Required inputs, keyed like UserData so tests can leave any one of them empty. */
  readonly requiredInputs: Record<RequiredAccountField, Locator>;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Enter Account Information' });

    this.nameInput = page.getByTestId('name');
    this.emailInput = page.getByTestId('email');
    this.daySelect = page.getByTestId('days');
    this.monthSelect = page.getByTestId('months');
    this.yearSelect = page.getByTestId('years');
    // The checkboxes have no data-qa but proper <label>s.
    this.newsletterCheckbox = page.getByLabel('Sign up for our newsletter!');
    this.specialOffersCheckbox = page.getByLabel('Receive special offers from our partners!');
    this.companyInput = page.getByTestId('company');
    this.address2Input = page.getByTestId('address2');
    this.countrySelect = page.getByTestId('country');
    this.createAccountButton = page.getByTestId('create-account');

    this.requiredInputs = {
      password: page.getByTestId('password'),
      firstName: page.getByTestId('first_name'),
      lastName: page.getByTestId('last_name'),
      address: page.getByTestId('address'),
      state: page.getByTestId('state'),
      city: page.getByTestId('city'),
      zipcode: page.getByTestId('zipcode'),
      mobileNumber: page.getByTestId('mobile_number'),
    };
  }

  /** Both title radios share data-qa="title", so the accessible name is used instead. */
  titleRadio(title: UserData['title']): Locator {
    return this.page.getByRole('radio', { name: `${title}.`, exact: true });
  }

  async expectToBeLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectPrefilled(name: string, email: string): Promise<void> {
    await expect(this.nameInput).toHaveValue(name);
    await expect(this.nameInput).toBeEditable();
    await expect(this.emailInput).toHaveValue(email);
    await expect(this.emailInput).toBeDisabled();
  }

  /** Fills every required field, optionally leaving one empty (TC-REG-005). */
  async fillRequired(
    user: UserData,
    options: { except?: RequiredAccountField } = {},
  ): Promise<void> {
    for (const [field, input] of Object.entries(this.requiredInputs) as [
      RequiredAccountField,
      Locator,
    ][]) {
      if (field !== options.except) await input.fill(user[field]);
    }
  }

  async fillOptional(user: UserData): Promise<void> {
    await this.titleRadio(user.title).check();
    await this.daySelect.selectOption(user.birthDay);
    await this.monthSelect.selectOption(user.birthMonth);
    await this.yearSelect.selectOption(user.birthYear);
    await this.newsletterCheckbox.setChecked(user.newsletter);
    await this.specialOffersCheckbox.setChecked(user.specialOffers);
    await this.companyInput.fill(user.company);
    await this.address2Input.fill(user.address2);
    await this.countrySelect.selectOption({ label: user.country });
  }

  async fillAll(user: UserData): Promise<void> {
    await this.fillOptional(user);
    await this.fillRequired(user);
  }

  async createAccount(): Promise<void> {
    await this.createAccountButton.click();
  }

  async expectSubmitBlockedBy(field: RequiredAccountField): Promise<void> {
    await expectFieldInvalid(this.requiredInputs[field]);
    await expect(this.page).toHaveURL(/\/signup$/);
    await expect(this.heading).toBeVisible();
  }
}
