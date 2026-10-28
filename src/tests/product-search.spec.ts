import { test } from '@playwright/test';

import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { blockThirdPartyRequests } from '../utils/network';

test('searches for a known product and verifies product details', async ({ page }) => {
  const productName = 'Blue Top';
  const productPrice = 'Rs. 500';
  const availability = 'In Stock';

  const productsPage = new ProductsPage(page);
  const productDetailsPage = new ProductDetailsPage(page);

  await blockThirdPartyRequests(page);

  await productsPage.open();
  await productsPage.expectToBeLoaded();

  await productsPage.search(productName);
  await productsPage.expectSearchResults();
  await productsPage.expectProductInResults(productName);

  await productsPage.openProduct(productName);

  await productDetailsPage.expectProductDetails(productName, productPrice, availability);

  await productDetailsPage.expectDefaultQuantity();

  await productDetailsPage.setQuantity(2);
  await productDetailsPage.expectQuantity(2);

  await productDetailsPage.expectAddToCartAvailable();
  await productDetailsPage.addToCart();
  await productDetailsPage.expectAddedToCart();
});
