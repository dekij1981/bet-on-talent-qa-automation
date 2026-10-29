import { formatPrice, parsePrice, primaryProduct as product } from '../data/products';
import { test } from '../fixtures';

test('searches for a known product and verifies product details', async ({
  productsPage,
  productDetailsPage,
  cartPage,
}) => {
  await productsPage.open();
  await productsPage.expectToBeLoaded();

  await productsPage.search(product.searchTerm);
  await productsPage.expectSearchResults();
  await productsPage.expectProductInResults(product.name, product.price);

  await productsPage.openProduct(product.name);

  await productDetailsPage.expectProduct(product);
  await productDetailsPage.expectQuantityAndAddToCartUsable();

  await productDetailsPage.setQuantity(product.quantity);
  await productDetailsPage.addToCart();
  await productDetailsPage.expectAddedModal();

  await productDetailsPage.viewCart();
  await cartPage.expectLine(
    product.name,
    product.quantity,
    formatPrice(parsePrice(product.price) * product.quantity),
  );
});
