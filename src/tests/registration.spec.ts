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
test('shows an error when registering with an existing email', async ({
  page,
  request,
}) => {
  const user = createUserData();

  const signupLoginPage = new SignupLoginPage(page);

  await blockThirdPartyRequests(page);

  try {
    const createResponse = await request.post('/api/createAccount', {
      form: {
        name: user.name,
        email: user.email,
        password: user.password,
        title: 'Mr',
        birth_date: user.day,
        birth_month: user.month,
        birth_year: user.year,
        firstname: user.firstName,
        lastname: user.lastName,
        company: user.company,
        address1: user.address,
        address2: user.address2,
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobileNumber,
      },
    });

    const createBody = await createResponse.json();

    expect(createBody.responseCode).toBe(201);
    expect(createBody.message).toBe('User created!');

    await signupLoginPage.open();
    await signupLoginPage.expectToBeLoaded();

    await signupLoginPage.startSignup(user.name, user.email);

    await signupLoginPage.expectExistingEmailError();
  } finally {
    await request.delete('/api/deleteAccount', {
      form: {
        email: user.email,
        password: user.password,
      },
    });
  }
});
