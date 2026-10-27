# QA Test Case Design

## Scope

This document describes the test scenarios designed for the Automation Exercise application.

The focus is on:

- User registration
- Product search
- High-value user journeys
- Negative and validation scenarios
- Test independence and repeatability
- Unique test data and cleanup

The automated suite will prioritise the scenarios that provide the highest value while keeping execution stable and maintainable.

---

# 1. User Registration

## TC-REG-001 — Successful user registration

Priority: P0  
Automation: Yes

### Objective

Verify that a new user can successfully create an account and is automatically logged in after registration.

### Preconditions

- The generated email address must not already exist.
- A unique email must be generated for every test execution.

### Steps

1. Open the application.
2. Navigate to `Signup / Login`.
3. Enter a unique name and email address.
4. Start the signup process.
5. Verify that the account information form is displayed.
6. Complete all required account information.
7. Complete the address information.
8. Submit the registration form.
9. Verify that the account has been created.
10. Continue to the application.
11. Verify that the user is logged in.
12. Delete the created account.

### Expected Result

- The registration form accepts valid data.
- The account is successfully created.
- The application confirms successful account creation.
- The user is logged in after registration.
- The created account is removed during cleanup.

### Test Data

A new unique email address must be generated for every test run.

Example:

`qa.user.<unique-id>@example.com`

### Cleanup

Delete the created account after the test.

---

## TC-REG-002 — Registration with an already registered email

Priority: P0  
Automation: Yes

### Objective

Verify that the application prevents registration when the supplied email address already belongs to an existing account.

### Preconditions

- A test account must first be created using unique data.

### Steps

1. Create a new account using a unique email address.
2. Return to the `Signup / Login` page.
3. Enter a new name.
4. Enter the same email address used by the existing account.
5. Submit the signup form.
6. Verify that an appropriate error message is displayed.
7. Remove the test account created during setup.

### Expected Result

- A second account cannot be created with the same email address.
- The application displays a clear validation message indicating that the email already exists.
- No duplicate account is created.

### Cleanup

Delete the account created during test setup.

---

## TC-REG-003 — Registration with missing required information

Priority: P1  
Automation: Optional

### Objective

Verify that the registration process does not complete when required information is missing.

### Steps

1. Navigate to `Signup / Login`.
2. Start registration using a unique email address.
3. Open the account information form.
4. Leave one or more required fields empty.
5. Attempt to submit the form.

### Expected Result

- Registration should not complete successfully.
- Required field validation should prevent invalid submission.
- No account should be created with incomplete required information.

### Notes

The exact validation behaviour should be confirmed against the application's implemented behaviour before adding this scenario to automated regression.

---

# 2. Product Search

## TC-SEARCH-001 — Search for a known product

Priority: P0  
Automation: Yes

### Objective

Verify that a user can search for a known product and open the correct product details.

### Test Data

Search term:

`Blue Top`

### Steps

1. Open the application.
2. Navigate to the `Products` page.
3. Verify that the product search control is available.
4. Search for `Blue Top`.
5. Verify that the search results are displayed.
6. Verify that the returned product matches the search term.
7. Open the product from the search results.
8. Verify that the product detail page is displayed.
9. Verify the product name.
10. Verify that a price is displayed.
11. Verify that availability information is displayed.
12. Verify that the quantity input is available and editable.
13. Verify that the `Add to cart` button is available.
14. Add the product to the cart.
15. Verify that the application confirms the add-to-cart action.

### Expected Result

- `Blue Top` appears in the search results.
- The correct product detail page opens.
- Product name, price and availability are displayed.
- The quantity input is usable.
- The `Add to cart` action works.

---

## TC-SEARCH-002 — Search with no matching products

Priority: P0  
Automation: Yes

### Objective

Verify that the application handles a search term that does not match any product.

### Test Data

Generate a search value that is extremely unlikely to match an existing product.

Example:

`non-existing-product-<unique-id>`

### Steps

1. Navigate to the `Products` page.
2. Enter the non-existing search term.
3. Submit the search.
4. Inspect the search results.

### Expected Result

- No unrelated products should be returned as valid matches.
- The application should remain usable.
- No application error or broken page should occur.

### Notes

The application may not provide a dedicated "no results" message. The automated assertion should reflect the application's real behaviour rather than assuming a message that does not exist.

---

## TC-SEARCH-003 — Search using a partial product name

Priority: P1  
Automation: Optional

### Objective

Evaluate how the search behaves when the user enters only part of a product name.

### Example Test Data

`Blue`

### Steps

1. Navigate to the `Products` page.
2. Search using a partial product name.
3. Inspect all returned results.

### Expected Result

- Search results should be relevant to the entered term.
- The page should remain stable and usable.
- Results should not contain obviously unrelated products.

### Notes

The exact matching rules are not defined in the assignment, so this scenario should first be explored manually before defining a strict automated assertion.

---

# Automation Prioritisation

| Test Case                               | Priority | Automate |
| --------------------------------------- | -------- | -------- |
| TC-REG-001 Successful registration      | P0       | Yes      |
| TC-REG-002 Existing email registration  | P0       | Yes      |
| TC-REG-003 Missing required information | P1       | Optional |
| TC-SEARCH-001 Known product search      | P0       | Yes      |
| TC-SEARCH-002 No matching products      | P0       | Yes      |
| TC-SEARCH-003 Partial product search    | P1       | Optional |

The initial automated suite focuses on four P0 scenarios.

These scenarios cover the most important user journeys and one important negative case for each functional area.

Additional edge cases can be added after the core suite is stable.

---

# Test Design Principles

Tests should be independent and must not depend on execution order.

Registration tests generate their own unique data so that they can run repeatedly and in parallel.

Any account created by a test must be deleted after the scenario finishes.

Assertions should verify user-visible behaviour rather than implementation details whenever possible.

Playwright locators and web-first assertions should be preferred over hard-coded waits.

The automation should remain intentionally small and focused on high-value scenarios rather than automating every possible variation.
