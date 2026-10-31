import { requiredAccountFields, type UserData } from '../data/users';
import { expect, test } from '../fixtures';
import type { AccountCreatedPage } from '../pages/AccountCreatedPage';
import type { AccountInfoPage } from '../pages/AccountInfoPage';
import type { SignupLoginPage } from '../pages/SignupLoginPage';

// Spec: docs/test-cases/registration.md

test.describe('User registration', () => {
  test(
    'TC-REG-001 Successful registration with all fields',
    { tag: ['@smoke', '@registration'] },
    async ({
      page,
      userFactory,
      apiClient,
      signupLoginPage,
      accountInfoPage,
      accountCreatedPage,
      header,
    }) => {
      const user = userFactory.build();

      await page.goto('/');
      await header.signupLoginLink.click();
      await signupLoginPage.expectToBeLoaded();

      await signupLoginPage.startSignup(user.name, user.email);
      await accountInfoPage.expectToBeLoaded();

      await accountInfoPage.fillAll(user);
      await accountInfoPage.createAccount();
      await accountCreatedPage.expectAccountCreated();

      await accountCreatedPage.continue();
      await header.expectLoggedInAs(user.name);

      const { responseCode, user: stored } = await apiClient.getUserDetailByEmail(user.email);
      expect(responseCode).toBe(200);
      expect(stored).toMatchObject({
        first_name: user.firstName,
        last_name: user.lastName,
        address1: user.address,
        country: user.country,
        state: user.state,
        city: user.city,
        zipcode: user.zipcode,
      });
    },
  );

  test(
    'TC-REG-002 Registration with an already registered email',
    { tag: ['@smoke', '@registration'] },
    async ({ userFactory, apiClient, signupLoginPage, accountInfoPage }) => {
      const existing = await userFactory.createViaApi();

      await signupLoginPage.open();
      await signupLoginPage.startSignup('Another Name', existing.email);

      await signupLoginPage.expectExistingEmailError();
      await expect(accountInfoPage.heading).toBeHidden();

      const login = await apiClient.verifyLogin(existing.email, existing.password);
      expect(login.responseCode, 'existing account still works').toBe(200);
    },
  );

  test(
    'TC-REG-003 New account can log out and log back in',
    { tag: ['@regression', '@registration'] },
    async ({ userFactory, signupLoginPage, accountInfoPage, accountCreatedPage, header }) => {
      const user = userFactory.build();

      await signupLoginPage.open();
      await signupLoginPage.startSignup(user.name, user.email);
      await accountInfoPage.fillRequired(user);
      await accountInfoPage.createAccount();
      await accountCreatedPage.continue();
      await header.expectLoggedInAs(user.name);

      await header.logout();
      await header.expectLoggedOut();

      await signupLoginPage.expectToBeLoaded();
      await signupLoginPage.login(user.email, user.password);
      await header.expectLoggedInAs(user.name);
    },
  );

  test(
    'TC-REG-004 Registration with mandatory fields only',
    { tag: ['@regression', '@registration'] },
    async ({ userFactory, signupLoginPage, accountInfoPage, accountCreatedPage, header }) => {
      const user = userFactory.build();

      await signupLoginPage.open();
      await signupLoginPage.startSignup(user.name, user.email);
      await accountInfoPage.fillRequired(user);
      await accountInfoPage.createAccount();

      await accountCreatedPage.expectAccountCreated();
      await accountCreatedPage.continue();
      await header.expectLoggedInAs(user.name);
    },
  );

  for (const field of requiredAccountFields) {
    test(
      `TC-REG-005 Missing required account information: ${field}`,
      { tag: ['@regression', '@registration'] },
      async ({ userFactory, apiClient, signupLoginPage, accountInfoPage }) => {
        const user = userFactory.build();

        await signupLoginPage.open();
        await signupLoginPage.startSignup(user.name, user.email);
        await accountInfoPage.fillRequired(user, { except: field });
        await accountInfoPage.createAccount();

        await accountInfoPage.expectSubmitBlockedBy(field);
        const detail = await apiClient.getUserDetailByEmail(user.email);
        expect(detail.responseCode, 'no partial account').toBe(404);
      },
    );
  }

  for (const email of ['plainaddress', 'user@', '@domain.com', 'user name@example.com']) {
    test(
      `TC-REG-006 Invalid email format on signup: "${email}"`,
      { tag: ['@regression', '@registration'] },
      async ({ signupLoginPage }) => {
        await signupLoginPage.open();
        await signupLoginPage.startSignup('QA User', email);

        await signupLoginPage.expectSignupBlockedBy('email');
      },
    );
  }

  const emptySignupFields: { empty: 'name' | 'email' }[] = [{ empty: 'name' }, { empty: 'email' }];
  for (const { empty } of emptySignupFields) {
    test(
      `TC-REG-007 Empty ${empty} on signup`,
      { tag: ['@regression', '@registration'] },
      async ({ userFactory, signupLoginPage }) => {
        const user = userFactory.build();

        await signupLoginPage.open();
        await signupLoginPage.startSignup(
          empty === 'name' ? '' : user.name,
          empty === 'email' ? '' : user.email,
        );

        await signupLoginPage.expectSignupBlockedBy(empty);
      },
    );
  }

  test(
    'TC-REG-008 Registered email in different letter case (DEF-01 symptom)',
    {
      tag: ['@regression', '@registration', '@known-defect'],
      annotation: {
        type: 'issue',
        description: 'DEF-01: duplicate-email check is case-sensitive',
      },
    },
    async ({ userFactory, signupLoginPage, accountInfoPage }) => {
      const existing = await userFactory.createViaApi();
      const upperCaseEmail = existing.email.toUpperCase();
      // If the defect lets the signup through, the duplicate account must be cleaned up too.
      userFactory.track(upperCaseEmail, existing.password);
      await signupLoginPage.open();
      await signupLoginPage.expectToBeLoaded();

      await signupLoginPage.startSignup(existing.name, upperCaseEmail);

      // DEF-01 symptom: the account form opens instead of the "already exists" error.
      const fixedMessage =
        'DEF-01 no longer reproduces: replace this test with a check that the error is shown';
      await expect(accountInfoPage.nameInput, fixedMessage).toBeVisible();
      await expect(signupLoginPage.existingEmailError, fixedMessage).toBeHidden();
      await accountInfoPage.expectPrefilled(existing.name, upperCaseEmail);
    },
  );

  test(
    'TC-REG-009 Name and email carried to the account form',
    { tag: ['@regression', '@registration'] },
    async ({ userFactory, signupLoginPage, accountInfoPage }) => {
      const user = userFactory.build();

      await signupLoginPage.open();
      await signupLoginPage.startSignup(user.name, user.email);

      await accountInfoPage.expectPrefilled(user.name, user.email);
    },
  );

  test(
    'TC-REG-010 Unicode and special characters in personal data',
    { tag: ['@regression', '@registration'] },
    async ({
      userFactory,
      apiClient,
      signupLoginPage,
      accountInfoPage,
      accountCreatedPage,
      header,
    }) => {
      const user = userFactory.build({
        name: 'Đorđe Šćepanović',
        firstName: 'Đorđe',
        lastName: 'Šćepanović',
        address: 'Kneza Miloša 7/II, "Stan" #4',
        city: 'Novi Sad',
      });

      await registerThroughUi(user, { signupLoginPage, accountInfoPage, accountCreatedPage });
      await header.expectLoggedInAs(user.name);

      const { user: stored } = await apiClient.getUserDetailByEmail(user.email);
      expect(stored).toMatchObject({
        name: user.name,
        first_name: user.firstName,
        last_name: user.lastName,
        address1: user.address,
        city: user.city,
      });
    },
  );

  test(
    'TC-REG-011 HTML in the name is displayed as text',
    { tag: ['@regression', '@registration'] },
    async ({ page, userFactory, signupLoginPage, accountInfoPage, accountCreatedPage, header }) => {
      const user = userFactory.build({ name: '<img src=x onerror=alert(1)>' });
      const dialogs: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });

      await registerThroughUi(user, { signupLoginPage, accountInfoPage, accountCreatedPage });

      await header.expectLoggedInAs(user.name);
      expect(dialogs, 'no script from the name was executed').toEqual([]);
    },
  );
});

/** Registration steps shared by cases whose subject is the data, not the flow itself. */
async function registerThroughUi(
  user: UserData,
  pages: {
    signupLoginPage: SignupLoginPage;
    accountInfoPage: AccountInfoPage;
    accountCreatedPage: AccountCreatedPage;
  },
): Promise<void> {
  await pages.signupLoginPage.open();
  await pages.signupLoginPage.startSignup(user.name, user.email);
  await pages.accountInfoPage.fillAll(user);
  await pages.accountInfoPage.createAccount();
  await pages.accountCreatedPage.expectAccountCreated();
  await pages.accountCreatedPage.continue();
}
