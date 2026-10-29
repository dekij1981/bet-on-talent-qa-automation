import { test as base } from '@playwright/test';

import { AccountCreatedPage } from '../pages/AccountCreatedPage';
import { AccountInfoPage } from '../pages/AccountInfoPage';
import { HomePage } from '../pages/HomePage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { SignupLoginPage } from '../pages/SignupLoginPage';

type PageFixtures = {
  accountCreatedPage: AccountCreatedPage;
  accountInfoPage: AccountInfoPage;
  homePage: HomePage;
  productDetailsPage: ProductDetailsPage;
  productsPage: ProductsPage;
  signupLoginPage: SignupLoginPage;
};

// Page objects are cheap to construct; each is created only when a test asks for it.
export const test = base.extend<PageFixtures>({
  accountCreatedPage: async ({ page }, use) => use(new AccountCreatedPage(page)),
  accountInfoPage: async ({ page }, use) => use(new AccountInfoPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productDetailsPage: async ({ page }, use) => use(new ProductDetailsPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  signupLoginPage: async ({ page }, use) => use(new SignupLoginPage(page)),
});
