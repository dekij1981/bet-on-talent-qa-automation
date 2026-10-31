# QA Test Case Design

## Scope

This folder describes the test scenarios designed for the Automation Exercise application
(<https://automationexercise.com>).

The focus is on:

- User registration
- Product search and product details
- High-value user journeys
- Negative and validation scenarios
- Test independence and repeatability
- Unique test data and cleanup after every test

Every scenario was designed from hands-on exploration of the live application, using both the UI
and its public API. Exploration also found **5 defects**, listed in
[Defects and Observations](#defects-and-observations).

| Feature           | File                                   | Test cases | P0  | Known defects |
| ----------------- | -------------------------------------- | :--------: | :-: | :-----------: |
| User registration | [registration.md](registration.md)     |     11     |  2  |       1       |
| Product search    | [product-search.md](product-search.md) |     11     |  2  |       4       |

---

# Priority Definitions

Priority = **how likely a real user is to hit the scenario × impact if it fails**.

| Priority | Meaning                                                                                 | Execution                          |
| -------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| **P0**   | Core user journey. If it fails, users cannot register or cannot find and buy a product. | Every commit (`@smoke`)            |
| **P1**   | Important negative, validation or data-integrity scenario that real users run into.     | Every pull request (`@regression`) |
| **P2**   | Edge case, robustness, security hygiene or UX gap.                                      | Regression run or manual           |

# Deciding What to Automate

Priority says **how important** a scenario is. The automation decision says **whether a script is
the best way to check it**. These are separate questions: a P0 scenario can stay manual if it can't
be checked reliably, and a P2 scenario is worth automating if it is cheap and stable.

A scenario is automated when it meets **all** of these rules:

|  #  | Rule               | Question to ask                                                                  |
| :-: | ------------------ | -------------------------------------------------------------------------------- |
|  1  | **Clear oracle**   | Is there one objectively correct result the test can assert?                     |
|  2  | **Repeated value** | Will this check be useful on every release, not just once?                       |
|  3  | **Deterministic**  | Can we control the data and the environment so the result is the same every run? |
|  4  | **Worth the cost** | Is it cheaper to keep the script working than to repeat the check by hand?       |

A scenario stays **manual** when any rule fails. Typical reasons:

- **No requirement** to assert against, so a human must judge the result first (password policy, [OBS-01](#observations)).
- **Visual or subjective** judgement, such as layout or wording.
- **One-off exploration** that will not be repeated.
- **Third-party content** we don't control, such as ads.

Two further choices follow from these rules:

- **Data-driven over copy-paste.** Variations of one scenario (8 required fields, 4 invalid
  emails) are one parameterised test, which makes them cheap to automate.
- **Known defects are automated too.** The test asserts the defect's documented symptom. It is
  green while the symptom reproduces and red for any other failure or when the defect is fixed.
  This keeps the defect visible in the report instead of in a forgotten ticket. See
  [How Known Defects Are Automated](#how-known-defects-are-automated) for the full approach.

Each test case states its reason in a **Why automated** or **Why manual** line.

# Automation Status

| Status                 | Meaning                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yes**                | Automated and expected to pass.                                                                                                                             |
| **Yes — known defect** | Automated as an assertion of the defect's symptom, with a link to the defect. The test turns red when the defect is fixed, so the expectation gets updated. |
| **Manual**             | Not automated. The reason is given in the test case.                                                                                                        |

# Tags

Every automated test has tags, so CI and developers can run exactly the subset they need.

| Tag             | Meaning                                                | When it runs                                              |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `@smoke`        | All P0 tests: the core journeys. Fast (a few minutes). | Every commit and before every deploy                      |
| `@regression`   | All other automated tests (P1 and P2).                 | Every pull request and nightly                            |
| `@registration` | Registration feature.                                  | When working on that feature                              |
| `@search`       | Product search and product details.                    | When working on that feature                              |
| `@known-defect` | Tests that assert the symptom of an open defect.       | With `@regression`; can be listed on their own for triage |

Each test has exactly one of `@smoke` or `@regression`, plus one feature tag. The full suite is
`@smoke` + `@regression`.

```bash
npx playwright test --grep @smoke                    # smoke only
npx playwright test --grep @search                   # one feature
npx playwright test --grep @known-defect             # open defects
npx playwright test --grep-invert @known-defect      # everything except known defects
```

---

# How Known Defects Are Automated

Exploration found five defects ([DEF-01 to DEF-05](#defects)). Each one has an automated test
that asserts the defect's **observed symptom**. This section explains why, how those tests are
written, what they do and do not prove, and what happens when a defect is fixed.

## The problem

A test for a known defect fails today, and will keep failing until the application is fixed. That
leaves three bad options:

- Leave it **red**: the suite is always red, people stop looking at it, and real regressions get
  lost in the noise.
- **Skip** it: the suite is green, but nobody notices when the defect is fixed, or when it gets
  worse.
- **Don't automate** it: the defect lives only in a ticket and is forgotten.

## What the tests assert

Each known-defect test asserts the symptom exactly as documented in [Defects](#defects), for
example "a search with leading spaces returns 0 results". The tests are **green while the symptom
reproduces** and **red for anything else**: a broken setup, a changed locator, a cleanup error,
or a defect that was fixed. Green therefore means "the defect still behaves as documented", not
"the feature works". The report lists these tests as open defects, never as passing features.

## Options considered

| Option                                        | What happens                                                                                               | Decision                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Assert the observed symptom                   | Green while the symptom reproduces; red on any other failure and when the defect is fixed.                 | **Chosen**                                                                                                                         |
| `test.fail()` with the correct behaviour      | Passes when the test fails, so any failure after the marker (locator, network, cleanup) counts as success. | Rejected: Playwright accepts every cause of failure as the expected one, and teardown errors are absorbed too (see the risk below) |
| `test.skip()`                                 | Never runs. The docs describe it for tests that are irrelevant in a configuration.                         | Rejected: a fix or a change in the defect goes unnoticed                                                                           |
| `test.fixme()`                                | Never runs.                                                                                                | Rejected: same as skip                                                                                                             |
| Keep the correct-behaviour test failing (red) | Suite is permanently red.                                                                                  | Rejected: hides real regressions                                                                                                   |
| Don't automate                                | Defect only in this document.                                                                              | Rejected: no signal when it changes                                                                                                |

The suite previously used `test.fail()`. A code review pointed out that it cannot tell the
documented symptom from a different cause, so it was replaced by the symptom assertions.

## Rules for writing a known-defect test

1. **Assert the documented symptom, with a message that says what to do when it is gone.** The
   message reads like "DEF-03 no longer reproduces: replace this test with …".
2. **Setup and preconditions come first and are ordinary assertions.** They fail loudly.
3. **Link the defect** with an annotation, so the HTML report shows which defect the test tracks:
   `annotation: { type: 'issue', description: 'DEF-02: …' }`. The title carries "(DEF-0x symptom)".
4. **Tag it** `@regression` and `@known-defect`, plus the feature tag. Known-defect tests are
   **never** in `@smoke`: the smoke suite must only contain tests that prove the core journeys work.
5. **One defect per test, with as few steps as possible.** Every extra step is another way to fail.
6. **No step may depend on the defect.** A wait that only works while the bug exists breaks once
   it is fixed with an unrelated timeout. Example: waiting for the exact unencoded search URL
   would time out after a fix of DEF-04, so the search helper waits for the next page navigation
   instead. Likewise, TC-SEARCH-007 clicks "Add to cart" with `force`.
7. **"Nothing happens" is observed for a bounded time.** TC-SEARCH-011 waits 3 s for a navigation
   and accepts only that timeout as the symptom; any other error is a real failure.

Example ([product-search.spec.ts](../../src/tests/product-search.spec.ts)):

```ts
await productsPage.search(`  ${product.searchTerm}`);

// DEF-03 symptom: the search finishes normally but returns 0 results.
await productsPage.expectSearchResults();
await expect(
  productsPage.resultCards,
  'DEF-03 no longer reproduces: replace this test with a check that results equal the baseline',
).toHaveCount(0);
```

## What this does not prove

- A green known-defect test does not show the feature works. It shows the documented defect is
  still there.
- The symptom is what was observed on the live site. If the site changes the symptom without
  fixing the defect (for example −2 now empties the cart), the test turns red and the symptom
  must be re-documented.
- Cleanup errors are not absorbed: a failed account deletion makes the test red, as in every
  other test.

**What was verified** (31 October 2026):

| Situation                                                  | Result                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| Defects present (live site)                                | All 7 known-defect tests pass                                 |
| Fix of each defect simulated in the browser (DEF-01 to 05) | Every affected test is red with "DEF-0x no longer reproduces" |

The fixes were simulated with temporary request routing and page scripts that were not committed:
DEF-01 lower-cases the signup email, DEF-02 rejects add-to-cart requests with quantity ≤ 0,
DEF-03 trims the search term, DEF-04 encodes it, and DEF-05 submits the search on Enter.

## When a defect is fixed

1. The known-defect test turns red with "DEF-0x no longer reproduces".
2. Confirm the fix by hand, using the steps to reproduce in [Defects](#defects).
3. Replace the symptom assertion with the correct-behaviour assertion, remove the `@known-defect`
   tag and the `issue` annotation, and drop "(DEF-0x symptom)" from the title.
4. In this folder, change the test case's status from "Yes — known defect" to "Yes", and mark the
   defect as fixed in the [Defects](#defects) table.

## Running known-defect tests

```bash
npx playwright test --grep @known-defect          # only the known-defect tests
npx playwright test --grep-invert @known-defect   # everything except them
npx playwright test --grep @smoke                 # never includes them
```

In the HTML report, each known-defect test shows its `issue` annotation with the defect ID, so the
report doubles as a live list of open defects.

## References

- [Playwright documentation — Annotations](https://playwright.dev/docs/test-annotations)

---

# Test Data and Cleanup Strategy

- **Unique data per test.** Emails are generated as
  `qa.<run-id>.<worker-index>.<random>@<domain>`. The domain is configurable. No test depends on
  data created by another test, so tests can run in any order and in parallel.
- **Set up through the API, verify through the UI.** When a scenario is not about creating an
  account (for example "email already exists"), the precondition user is created with
  `POST /api/createAccount`. This is faster and less flaky than the UI.
- **Cleanup in fixture teardown.** Every account a test builds or creates is registered with a
  fixture _before_ it is created, and deleted with `DELETE /api/deleteAccount` after the test body,
  whether the test passed or failed. A failed call (network error, server error) is retried once.
  Each account is attempted even if an earlier deletion fails, and all failures are reported
  together. "Not found" is accepted: the account may never have
  been created. Cleanup cannot run if the test process is killed, and it fails (visibly) if the
  API stays unavailable, so leftovers are possible in those cases; the run ID in the email traces
  them back.
- **API as an independent oracle.** `POST /api/searchProduct`, `GET /api/productsList` and
  `GET /api/getUserDetailByEmail` are used to check that the UI shows the right data.
- **Configurable test data.** The user profile, the main product and catalogue-dependent search
  terms come from built-in defaults, an optional JSON file (`TEST_DATA_FILE`) and `PRODUCT_*`
  environment variables. Inputs that _are_ the scenario (invalid emails, script payloads) stay in
  the tests. See the main [README](../../README.md#test-data).

---

# Automation Prioritisation

| Test Case                                                                                          | Priority | Automate           | Tags                                          |
| -------------------------------------------------------------------------------------------------- | :------: | ------------------ | --------------------------------------------- |
| [TC-REG-001](registration.md#tc-reg-001) Successful registration with all fields                   |    P0    | Yes                | `@smoke` `@registration`                      |
| [TC-REG-002](registration.md#tc-reg-002) Registration with an already registered email             |    P0    | Yes                | `@smoke` `@registration`                      |
| [TC-REG-003](registration.md#tc-reg-003) New account can log out and log back in                   |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-004](registration.md#tc-reg-004) Registration with mandatory fields only                   |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-005](registration.md#tc-reg-005) Missing required account information                      |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-006](registration.md#tc-reg-006) Invalid email format on signup                            |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-007](registration.md#tc-reg-007) Empty name or email on signup                             |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-008](registration.md#tc-reg-008) Registered email in different letter case                 |    P1    | Yes — known defect | `@regression` `@registration` `@known-defect` |
| [TC-REG-009](registration.md#tc-reg-009) Name and email carried to the account form                |    P2    | Yes                | `@regression` `@registration`                 |
| [TC-REG-010](registration.md#tc-reg-010) Unicode and special characters in personal data           |    P2    | Yes                | `@regression` `@registration`                 |
| [TC-REG-011](registration.md#tc-reg-011) HTML in the name is displayed as text                     |    P2    | Yes                | `@regression` `@registration`                 |
| [TC-SEARCH-001](product-search.md#tc-search-001) Search for a known product and add it to the cart |    P0    | Yes                | `@smoke` `@search`                            |
| [TC-SEARCH-002](product-search.md#tc-search-002) Search with no matching products                  |    P0    | Yes                | `@smoke` `@search`                            |
| [TC-SEARCH-003](product-search.md#tc-search-003) Search using a partial product name               |    P1    | Yes                | `@regression` `@search`                       |
| [TC-SEARCH-004](product-search.md#tc-search-004) Search is case-insensitive                        |    P1    | Yes                | `@regression` `@search`                       |
| [TC-SEARCH-005](product-search.md#tc-search-005) Empty search returns all products                 |    P1    | Yes                | `@regression` `@search`                       |
| [TC-SEARCH-006](product-search.md#tc-search-006) Search results open the matching product page     |    P1    | Yes                | `@regression` `@search`                       |
| [TC-SEARCH-007](product-search.md#tc-search-007) Quantity rejects zero and negative values         |    P1    | Yes — known defect | `@regression` `@search` `@known-defect`       |
| [TC-SEARCH-008](product-search.md#tc-search-008) Leading spaces are ignored                        |    P1    | Yes — known defect | `@regression` `@search` `@known-defect`       |
| [TC-SEARCH-009](product-search.md#tc-search-009) Search terms containing `&`                       |    P1    | Yes — known defect | `@regression` `@search` `@known-defect`       |
| [TC-SEARCH-010](product-search.md#tc-search-010) Script and SQL-like input is handled safely       |    P2    | Yes                | `@regression` `@search`                       |
| [TC-SEARCH-011](product-search.md#tc-search-011) Pressing Enter submits the search                 |    P2    | Yes — known defect | `@regression` `@search` `@known-defect`       |

The **P0 scenarios** cover the journey most users take: register → be logged in → search →
open a product → add it to the cart. They run on every commit as the smoke suite.

### Deliberately not automated

| Area                                       | Reason                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Password policy and whitespace-only values | No requirement exists to assert against. Raised as a product question ([OBS-01](#observations)).                                  |
| Visual layout and responsive design        | Needs a visual-regression baseline; out of scope for functional E2E.                                                              |
| Login and Delete Account features          | Not in the brief. Login is used only in TC-REG-003 to prove registration worked; accounts are deleted through the API in cleanup. |
| Firefox and WebKit on every commit         | Chromium runs on every commit; other browsers are optional CI projects.                                                           |
| Ads and consent dialogs                    | Third-party content we don't control. Blocked at network level (see the main README).                                             |

---

# Defects and Observations

## Defects

Every defect was reproduced at least twice through the UI (real typing and clicks), on
29 October 2026. Test accounts used for reproduction were deleted afterwards.

The brief does not specify these behaviours, so each expected result rests on a stated basis:

| ID     | Observed behaviour                            | Expected behaviour and its basis                                                                                                                                                                                                  |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-01 | `USER@X.TEST` registers next to `user@x.test` | **Assumption.** Domains are case-insensitive by standard; the local part may legally be case-sensitive (RFC 5321), but common providers treat it as case-insensitive, so most sites normalise emails to avoid duplicate accounts. |
| DEF-02 | Quantity `-2` / `0` reported as "Added!"      | **The site's own markup:** the input declares `min="1"`. A quantity below 1 has no meaning for a purchase.                                                                                                                        |
| DEF-03 | Leading spaces return 0 results               | **Assumption.** Users paste text with stray spaces; trimming is common practice.                                                                                                                                                  |
| DEF-04 | `&` cuts the term                             | **The site's own data:** the terms are parts of real product names, yet the search cannot find them.                                                                                                                              |
| DEF-05 | Enter does nothing                            | **Assumption (UX convention).** Search fields on most sites submit on Enter.                                                                                                                                                      |

| ID     | Severity | Summary                                                                 | Covered by                                       |
| ------ | -------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| DEF-01 | Major    | Duplicate-email check is case-sensitive, so a second account is created | [TC-REG-008](registration.md#tc-reg-008)         |
| DEF-02 | Major    | Quantity `-2` reduces the cart; `0` shows a false "Added!" message      | [TC-SEARCH-007](product-search.md#tc-search-007) |
| DEF-03 | Minor    | Leading spaces in the search term return no results                     | [TC-SEARCH-008](product-search.md#tc-search-008) |
| DEF-04 | Major    | Search term is not URL-encoded, so `&` (and `#`) cut the term           | [TC-SEARCH-009](product-search.md#tc-search-009) |
| DEF-05 | Minor    | Pressing Enter does not submit the search                               | [TC-SEARCH-011](product-search.md#tc-search-011) |

**DEF-01 — steps to reproduce**

1. Create a user with email `user@example.test`.
2. On `/login`, sign up with `USER@EXAMPLE.TEST` (or `User@Example.test`).
3. Complete the account form and click **Create Account**.

Expected: `Email Address already exist!` on step 2.
Actual: the account form opens and `Account Created!` is shown. The API returns two accounts with
different IDs.

**DEF-02 — steps to reproduce**

1. Add Blue Top with quantity 3 to the cart.
2. On the Blue Top page, set quantity to `-2` and click **Add to cart**.
3. Open the cart.

Expected: the value is rejected and the cart still shows × 3.
Actual: the modal says `Added! Your product has been added to cart.` and the cart shows
Blue Top × 1, Rs. 500.

With quantity `0` the same "Added!" modal appears, but the cart does not change, so the user is
told something happened when it did not.

**DEF-03 — steps to reproduce**

1. Search for `"  Blue Top"` (two spaces before the term).

Expected: Blue Top is found.
Actual: 0 results.

Trailing spaces do **not** cause the problem, because the browser drops them from the URL.

**DEF-04 — steps to reproduce**

1. Search for `Blue & Pink`.
2. Search for `Fit & Flare`.

Expected: 1 product each (both terms appear in real product names).
Actual: 5 and 3 products, including unrelated ones such as Blue Top. The page builds the URL as
`'/products?search=' + value` without encoding the value, so the term is cut at `&`.

`#` is affected by the same mechanism (the rest becomes a URL fragment). This was observed once:
`Blue Top#nothing` returned Blue Top instead of no results. It is not automated, because no
product in the catalogue contains `#`, so there is no real-data case with a clear expected result.

**DEF-05 — steps to reproduce**

1. Click the search field, type `Blue Top` and press Enter.

Expected: the search runs.
Actual: nothing happens. The input is not inside a `<form>`, and only a click on the button is
handled.

## Observations

| ID     | Type                | Observation                                                                                                                                                                                                                                                     | Effect on the suite                      |
| ------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| OBS-01 | Product question    | No password policy: password `a` is accepted. A single space passes every `required` field and is stored as the value.                                                                                                                                          | Not automated; product question          |
| OBS-02 | UX                  | No empty-state message when a search has no matches.                                                                                                                                                                                                            | TC-SEARCH-002 asserts zero product cards |
| OBS-03 | Test infrastructure | The API returns HTTP 200 for every response, including errors; the real status is `responseCode` in the body.                                                                                                                                                   | API client checks `responseCode`         |
| OBS-04 | Test infrastructure | Each product card renders its name and price twice (card and hover overlay).                                                                                                                                                                                    | Locators are scoped to one of them       |
| OBS-05 | Test infrastructure | Google Ads cause three separate problems: full-screen `#google_vignette` ads that swallow clicks (seen 4 times in one session), banners that shift the layout during a click, and auto-inserted links that add text such as "Browse Clothing" to product names. | Ad domains are blocked in a fixture      |
| OBS-06 | Test infrastructure | Search matches product name **and category**, but not brand: `Polo` returns 1 product, although 6 products have the brand Polo.                                                                                                                                 | Result sets are compared with the API    |

---

# Test Design Principles

Tests are independent and do not depend on execution order.

Every test generates its own unique data, so the suite can run repeatedly and in parallel.

Every account a test creates is deleted in fixture teardown, whether the test passed or failed.

Preconditions that are not the subject of the test are created through the API, not the UI.

Assertions verify user-visible behaviour with concrete expected values. Phrases such as "an
appropriate message" are avoided, because they cannot fail.

Assertions reflect the application's actual behaviour. Where that behaviour is wrong, the test
documents it as a known defect instead of hiding it.

Playwright role-based and `data-qa` locators and web-first assertions are used; hard-coded waits
are not.

The suite is intentionally focused on high-value scenarios rather than automating every possible
variation.
