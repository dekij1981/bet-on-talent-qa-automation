import { primaryProduct as product } from '../data/products';
import { test } from '../fixtures';

test('searches for a known product and verifies product details', async ({
  productsPage,
  productDetailsPage,
}) => {
  await productsPage.open();
  await productsPage.expectToBeLoaded();

  await productsPage.search(product.searchTerm);
  await productsPage.expectSearchResults();
  await productsPage.expectProductInResults(product.name);

  await productsPage.openProduct(product.name);

  await productDetailsPage.expectProductDetails(product.name, product.price, product.availability);

  await productDetailsPage.expectDefaultQuantity();

  await productDetailsPage.setQuantity(product.quantity);
  await productDetailsPage.expectQuantity(product.quantity);

  await productDetailsPage.expectAddToCartAvailable();
  await productDetailsPage.addToCart();
  await productDetailsPage.expectAddedToCart();
});
