import { test as base } from '@playwright/test';

import { AccountCreatedPage } from '../pages/AccountCreatedPage';
import { AccountInfoPage } from '../pages/AccountInfoPage';
import { CartPage } from '../pages/CartPage';
import { Header } from '../pages/components/Header';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { SignupLoginPage } from '../pages/SignupLoginPage';

type PageFixtures = {
  accountCreatedPage: AccountCreatedPage;
  accountInfoPage: AccountInfoPage;
  cartPage: CartPage;
  header: Header;
  productDetailsPage: ProductDetailsPage;
  productsPage: ProductsPage;
  signupLoginPage: SignupLoginPage;
};

// Page objects are cheap to construct; each is created only when a test asks for it.
export const test = base.extend<PageFixtures>({
  accountCreatedPage: async ({ page }, use) => use(new AccountCreatedPage(page)),
  accountInfoPage: async ({ page }, use) => use(new AccountInfoPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  header: async ({ page }, use) => use(new Header(page)),
  productDetailsPage: async ({ page }, use) => use(new ProductDetailsPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  signupLoginPage: async ({ page }, use) => use(new SignupLoginPage(page)),
});
