import { test } from '@playwright/test';

import { createUserData } from '../data/user';
import { AccountCreatedPage } from '../pages/AccountCreatedPage';
import { AccountInfoPage } from '../pages/AccountInfoPage';
import { HomePage } from '../pages/HomePage';
import { SignupLoginPage } from '../pages/SignupLoginPage';
import { blockThirdPartyRequests } from '../utils/network';

test('registers a new user successfully', async ({ page, request }) => {
  const user = createUserData();

  const signupLoginPage = new SignupLoginPage(page);
  const accountInfoPage = new AccountInfoPage(page);
  const accountCreatedPage = new AccountCreatedPage(page);
  const homePage = new HomePage(page);

  await blockThirdPartyRequests(page);

  try {
    await signupLoginPage.open();
    await signupLoginPage.expectToBeLoaded();

    await signupLoginPage.startSignup(user.name, user.email);

    await accountInfoPage.expectToBeLoaded();
    await accountInfoPage.fillAccountDetails(user);
    await accountInfoPage.createAccount();

    await accountCreatedPage.expectAccountCreated();
    await accountCreatedPage.continue();

    await homePage.expectLoggedInAs(user.name);
  } finally {
    await request.delete('/api/deleteAccount', {
      form: {
        email: user.email,
        password: user.password,
      },
    });
  }
});
