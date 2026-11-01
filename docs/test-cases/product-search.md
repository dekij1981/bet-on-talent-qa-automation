# Product Search — Test Cases

[← Back to overview](README.md)

## Flow Under Test

```text
/products                "All Products"  →  type in "Search Product"  →  click search button
/products?search=<term>  "Searched Products"  →  View Product
/product_details/<id>    set quantity  →  Add to cart  →  View Cart
```

## How Search Behaves

These rules were confirmed during exploration and are used as the test oracle:

- Matching is **case-insensitive** and finds the term **anywhere** in the text.
- It searches the product **name and category**, but not the brand. For example, `dress` also
  returns _Sleeves Top and Short - Blue & Pink_, whose category is _Dress_.
- Because of this, "every result name contains the term" is not asserted. The UI results are
  compared with `POST /api/searchProduct` for the same term, and every API result is checked
  against the rule above.

## Summary

| ID                              | Title                                             | Priority | Automation         | Tags                                    |
| ------------------------------- | ------------------------------------------------- | :------: | ------------------ | --------------------------------------- |
| [TC-SEARCH-001](#tc-search-001) | Search for a known product and add it to the cart |    P0    | Yes                | `@smoke` `@search`                      |
| [TC-SEARCH-002](#tc-search-002) | Search with no matching products                  |    P0    | Yes                | `@smoke` `@search`                      |
| [TC-SEARCH-003](#tc-search-003) | Search using a partial product name               |    P1    | Yes                | `@regression` `@search`                 |
| [TC-SEARCH-004](#tc-search-004) | Search is case-insensitive                        |    P1    | Yes                | `@regression` `@search`                 |
| [TC-SEARCH-005](#tc-search-005) | Empty search returns all products                 |    P1    | Yes                | `@regression` `@search`                 |
| [TC-SEARCH-006](#tc-search-006) | Search results open the matching product page     |    P1    | Yes                | `@regression` `@search`                 |
| [TC-SEARCH-007](#tc-search-007) | Quantity rejects zero and negative values         |    P1    | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-008](#tc-search-008) | Leading spaces are ignored                        |    P1    | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-009](#tc-search-009) | Search terms containing `&`                       |    P1    | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-010](#tc-search-010) | Script and SQL-like input is handled safely       |    P2    | Yes                | `@regression` `@search`                 |
| [TC-SEARCH-011](#tc-search-011) | Pressing Enter submits the search                 |    P2    | Yes — known defect | `@regression` `@search` `@known-defect` |

> **Cart isolation:** every test runs in a fresh browser context, so the cart always starts
> empty and no cleanup is needed.

---

<a id="tc-search-001"></a>

## TC-SEARCH-001 — Search for a known product and add it to the cart

Priority: P0  
Automation: Yes  
Tags: `@smoke` `@search`  
Why automated: Main search-to-cart journey; required by the brief

### Objective

Verify that a user can find a known product, open it from the results, see the correct product
details, and add a chosen quantity to the cart. This is the main path from searching to buying.

### Test Data

From the test data configuration (built-in defaults shown; overridable with `TEST_DATA_FILE` or
`PRODUCT_*` environment variables):

| Field           | Value      |
| --------------- | ---------- |
| Search term     | `Blue Top` |
| Name            | Blue Top   |
| Price           | Rs. 500    |
| Availability    | In Stock   |
| Quantity to add | 3          |

### Steps

1. Open `/products`.
2. Type `Blue Top` in the search field and click the search button.
3. On the **Blue Top** card, click **View Product**.
4. Change the quantity to `3` and click **Add to cart**.
5. In the confirmation modal, click **View Cart**.

### Expected Result

- After step 2:
  - the heading **Searched Products** is visible
  - the result names are exactly those returned by `POST /api/searchProduct` for the term, and
    each matches it by name or category
  - **Blue Top** is listed with price **Rs. 500**
- After step 3:
  - the URL is `/product_details/<id>`
  - the name is **Blue Top**, the price **Rs. 500** and the availability **In Stock**
  - the quantity input is visible, editable and has the default value `1`
  - the **Add to cart** button is visible and enabled
- After step 4: a modal with the heading **Added!** and the links **View Cart** and
  **Continue Shopping** is displayed.
- After step 5: the cart contains **Blue Top**, quantity **3**, total **Rs. 1500**.

### Notes

Checking the cart contents proves that the quantity input and the button actually work, not only
that they are displayed.

---

<a id="tc-search-002"></a>

## TC-SEARCH-002 — Search with no matching products

Priority: P0  
Automation: Yes  
Tags: `@smoke` `@search`  
Why automated: Required by the brief; deterministic with a generated term

### Objective

Verify that the application handles a search term that does not match any product.

### Test Data

A generated term that cannot match a product: `non-existing-product-<unique-id>`

### Steps

1. Open `/products`.
2. Type the test term in the search field and click the search button.

### Expected Result

- The heading **Searched Products** is visible.
- No product cards are displayed.
- The page has no server error and stays usable.

### Notes

The application does not show a dedicated "no results" message. For a non-empty term with no
matches, the **Searched Products** section stays visible but contains no product cards. The test
asserts this actual behaviour rather than a message the application does not provide.

From a UX perspective, a clear empty-state message would improve the experience, for example:
`No results for your search. Check the spelling or try a more general term.` This is recorded as a
UX recommendation ([OBS-02](README.md#observations)), not as current expected behaviour.

An empty search behaves differently and is covered by [TC-SEARCH-005](#tc-search-005).

---

<a id="tc-search-003"></a>

## TC-SEARCH-003 — Search using a partial product name

Priority: P1  
Automation: Yes  
Tags: `@regression` `@search`  
Why automated: Most common real search; API oracle keeps it stable when the catalogue changes

### Objective

Verify that searching with part of a name returns every relevant product and nothing unrelated.
Users often type only one word.

### Test Data

Default terms (configurable as `search.partialTerms`):

| Run | Term    | Note                                                                       |
| :-: | ------- | -------------------------------------------------------------------------- |
|  1  | `top`   | 14 results; 2 match by category only (e.g. _Little Girls Mr. Panda Shirt_) |
|  2  | `jeans` | 3 results, all match by name                                               |

### Steps

1. Open `/products`.
2. Search for the test term.

### Expected Result

- More than one product card is displayed.
- Every result contains the term in its name **or** its category, ignoring case.
- The names shown in the UI are exactly the names returned by `POST /api/searchProduct` for the
  same term.

### Notes

A check that "every result name contains the term" would fail for `top`: two results are shirts
that match only through their category _Tops & Shirts_. The assertion therefore follows the real
search rule, and the API comparison keeps the test independent of the current catalogue. The
counts in the table are informational only.

---

<a id="tc-search-004"></a>

## TC-SEARCH-004 — Search is case-insensitive

Priority: P1  
Automation: Yes  
Tags: `@regression` `@search`  
Why automated: Data-driven; fast; clear oracle

### Objective

Verify that letter case does not change the results.

### Test Data

Derived from the main search term: lower case, upper case and alternating case. For the default
term `Blue Top`: `blue top`, `BLUE TOP`, `bLuE tOp`.

### Steps

1. Search for `Blue Top` and record the result names.
2. Search for each test term.

### Expected Result

- Each test term returns exactly the same result names as `Blue Top`.

---

<a id="tc-search-005"></a>

## TC-SEARCH-005 — Empty search returns all products

Priority: P1  
Automation: Yes  
Tags: `@regression` `@search`  
Why automated: Fast; clear oracle via API

### Objective

Verify what happens when the user clicks search without typing anything.

### Steps

1. Open `/products`.
2. Leave the search field empty and click the search button.

### Expected Result

- The heading **All Products** is visible.
- The product cards show exactly the products returned by `GET /api/productsList`: same count
  and same names, independent of order.

---

<a id="tc-search-006"></a>

## TC-SEARCH-006 — Search results open the matching product page

Priority: P1  
Automation: Yes  
Tags: `@regression` `@search`  
Why automated: Checks several links in one run; slow and boring manually

### Objective

Verify that search results link to the right product. This catches broken links and wrong product
IDs between the results list and the product page.

### Test Data

Search term `top` and a sample of 5 results (both configurable).

### Steps

1. Search for the term and record the name, price and link of every result card.
2. Open the product page of an evenly spread sample of the cards: the first, the last and those in
   between.

### Notes

A sample keeps the test's duration bounded as the catalogue grows: opening all 14 results took
10–12 s, close to the 30 s test timeout when the site is slow. Spreading the sample over the list
still catches a systematic ID mismatch, but a single broken link outside the sample can be missed.

### Expected Result

- Each product page shows the same name and price as its card.

---

<a id="tc-search-007"></a>

## TC-SEARCH-007 — Quantity rejects zero and negative values

Priority: P1  
Automation: Yes — known defect ([DEF-02](README.md#defects))  
Tags: `@regression` `@search` `@known-defect`  
Why automated: Documents DEF-02 (cart data integrity) and detects the fix

### Objective

Verify that the quantity input does not accept values that make no sense for a purchase.

### Test Data

| Run | Quantity |
| :-: | -------- |
|  1  | `0`      |
|  2  | `-2`     |

### Preconditions

- The main product (default Blue Top) with quantity 3 is in the cart, verified in the cart.

### Steps

1. Open the Blue Top product page.
2. Set the quantity to the test value and click **Add to cart**.
3. Open the cart.

### Expected Result

- The value is rejected (the input has `min="1"`).
- The cart still shows Blue Top × **3**.

### Actual Result

- `0`: the modal says **Added!**, but the cart does not change. The user gets a false success
  message.
- `-2`: the modal says **Added!** and the cart is **reduced to Blue Top × 1, Rs. 500**.

### Notes

- "Rejected" is checked as: no **Added!** confirmation, and the cart unchanged. For `0` the cart is
  already correct today, so without the confirmation check the test would pass and wrongly report
  the defect as fixed.
- A modal that is _not_ shown cannot be checked right after the click, because it appears only
  after an AJAX call. The test first waits for jQuery's request counter to reach zero, which
  happens only after the callback that would open the modal has run.
- The test asserts both symptoms: "Added!" is shown, and the cart quantity changed by the invalid
  value (`-2` reduces it, `0` leaves it).
- The precondition (product × 3 in the cart) is verified in the cart first. "Add to cart" is clicked with `force`, so a fix that disables the button counts as a
  rejection instead of stalling the click.

---

<a id="tc-search-008"></a>

## TC-SEARCH-008 — Leading spaces are ignored

Priority: P1  
Automation: Yes — known defect ([DEF-03](README.md#defects))  
Tags: `@regression` `@search` `@known-defect`  
Why automated: Documents DEF-03 and detects the fix

### Objective

Verify that extra spaces before the term do not change the results. Users often paste text with
extra spaces.

### Test Data

The main search term with two leading spaces, by default `"  Blue Top"`.

### Steps

1. Open `/products`.
2. Search for the test term.

### Expected Result

- The same results as for `Blue Top`.

### Actual Result

- 0 results, because the term is not trimmed.

### Notes

Trailing spaces do not cause the problem, because the browser drops them from the URL. The test
therefore uses leading spaces only.

---

<a id="tc-search-009"></a>

## TC-SEARCH-009 — Search terms containing `&`

Priority: P1  
Automation: Yes — known defect ([DEF-04](README.md#defects))  
Tags: `@regression` `@search` `@known-defect`  
Why automated: Documents DEF-04 and detects the fix

### Objective

Verify that special characters that appear in real product names are searched literally.

### Test Data

Default terms (configurable as `search.ampersandTerms`):

| Run | Term          | Real product containing it                             |
| :-: | ------------- | ------------------------------------------------------ |
|  1  | `Fit & Flare` | Sleeveless Unicorn Print Fit & Flare Net Dress - Multi |
|  2  | `Blue & Pink` | Sleeves Top and Short - Blue & Pink                    |

### Steps

1. Open `/products`.
2. Search for the test term.

### Expected Result

- Only the matching product is returned (one result per term).

### Actual Result

- Unrelated products are returned: `Blue & Pink` returns 5 results (including Blue Top) and
  `Fit & Flare` returns 3.

### Notes

Root cause: the page builds the URL as `'/products?search=' + value` without encoding the value,
so the term is cut at `&`. The terms are configurable; each must appear in exactly one product name
or category, which the test checks before searching.

`#` is affected by the same mechanism and was observed once, but it is not automated: no catalogue
product contains `#`, so there is no real-data case (see [DEF-04](README.md#defects)).

---

<a id="tc-search-010"></a>

## TC-SEARCH-010 — Script and SQL-like input is handled safely

Priority: P2  
Automation: Yes  
Tags: `@regression` `@search`  
Why automated: Regression examples for input handling; deterministic check

### Objective

Verify that three specific inputs that look like code are treated as plain text by the search.

This is a set of **regression examples**, not a security test. It shows these inputs do not
trigger a dialog or a server error; it does not show that the application is free of XSS or SQL
injection.

### Test Data

`<script>alert(1)</script>`, `' OR '1'='1`, `%`

### Steps

1. Open `/products`.
2. Search for each test term.

### Expected Result

- No browser dialog is triggered.
- The page renders normally with the heading **Searched Products** and 0 product cards.
- No server error.

---

<a id="tc-search-011"></a>

## TC-SEARCH-011 — Pressing Enter submits the search

Priority: P2  
Automation: Yes — known defect ([DEF-05](README.md#defects))  
Tags: `@regression` `@search` `@known-defect`  
Why automated: Documents DEF-05 and detects the fix

### Objective

Verify that the search can be submitted with the keyboard. This is an **assumed requirement**
(a common UX convention), not one from the brief.

### Steps

1. Open `/products`.
2. Type `Blue Top` in the search field and press **Enter**.

### Expected Result

- The search runs and the heading **Searched Products** is visible.

### Actual Result

- Nothing happens. The input is not inside a `<form>`, and only a click on the button is handled.
