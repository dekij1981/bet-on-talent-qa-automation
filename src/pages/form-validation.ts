import { expect, type Locator } from '@playwright/test';

/**
 * Native HTML5 validation: the field matches :invalid and has a validation message.
 * The message text differs between browsers, so only its presence is checked.
 */
export async function expectFieldInvalid(field: Locator): Promise<void> {
  await expect(field.and(field.page().locator(':invalid'))).toBeVisible();
  await expect(field).not.toHaveJSProperty('validationMessage', '');
}
