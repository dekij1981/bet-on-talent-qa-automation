import { test } from '../fixtures';

test('registers a new user successfully', async ({
  userFactory,
  signupLoginPage,
  accountInfoPage,
  accountCreatedPage,
  header,
}) => {
  const user = userFactory.build();

  await signupLoginPage.open();
  await signupLoginPage.expectToBeLoaded();

  await signupLoginPage.startSignup(user.name, user.email);

  await accountInfoPage.expectToBeLoaded();
  await accountInfoPage.fillAll(user);
  await accountInfoPage.createAccount();

  await accountCreatedPage.expectAccountCreated();
  await accountCreatedPage.continue();

  await header.expectLoggedInAs(user.name);
});

test('shows an error when registering with an existing email', async ({
  userFactory,
  signupLoginPage,
}) => {
  const user = await userFactory.createViaApi();

  await signupLoginPage.open();
  await signupLoginPage.expectToBeLoaded();

  await signupLoginPage.startSignup(user.name, user.email);

  await signupLoginPage.expectExistingEmailError();
});
