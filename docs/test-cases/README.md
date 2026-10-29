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
- Unique test data and guaranteed cleanup

Every scenario was designed from hands-on exploration of the live application, using both the UI
and its public API. Exploration also found **5 defects**, listed in
[Defects and Observations](#defects-and-observations).

| Feature | File | Test cases | P0 | Known defects |
| --- | --- | :-: | :-: | :-: |
| User registration | [registration.md](registration.md) | 11 | 2 | 1 |
| Product search | [product-search.md](product-search.md) | 11 | 2 | 4 |

---

# Priority Definitions

Priority = **how likely a real user is to hit the scenario × impact if it fails**.

| Priority | Meaning | Execution |
| --- | --- | --- |
| **P0** | Core user journey. If it fails, users cannot register or cannot find and buy a product. | Every commit (`@smoke`) |
| **P1** | Important negative, validation or data-integrity scenario that real users run into. | Every pull request (`@regression`) |
| **P2** | Edge case, robustness, security hygiene or UX gap. | Regression run or manual |

# Deciding What to Automate

Priority says **how important** a scenario is. The automation decision says **whether a script is
the best way to check it**. These are separate questions: a P0 scenario can stay manual if it can't
be checked reliably, and a P2 scenario is worth automating if it is cheap and stable.

A scenario is automated when it meets **all** of these rules:

| # | Rule | Question to ask |
| :-: | --- | --- |
| 1 | **Clear oracle** | Is there one objectively correct result the test can assert? |
| 2 | **Repeated value** | Will this check be useful on every release, not just once? |
| 3 | **Deterministic** | Can we control the data and the environment so the result is the same every run? |
| 4 | **Worth the cost** | Is it cheaper to keep the script working than to repeat the check by hand? |

A scenario stays **manual** when any rule fails. Typical reasons:

- **No requirement** to assert against, so a human must judge the result first (password policy, [OBS-01](#observations)).
- **Visual or subjective** judgement, such as layout or wording.
- **One-off exploration** that will not be repeated.
- **Third-party content** we don't control, such as ads.

Two further choices follow from these rules:

- **Data-driven over copy-paste.** Variations of one scenario (8 required fields, 4 invalid
  emails) are one parameterised test, which makes them cheap to automate.
- **Known defects are automated too.** The test asserts the *correct* behaviour and is marked
  `test.fail()`. The suite stays green today and reports when the defect is fixed. This keeps the
  defect visible in the report instead of in a forgotten ticket. See
  [How Known Defects Are Automated](#how-known-defects-are-automated) for the full approach.

Each test case states its reason in a **Why automated** or **Why manual** line.

# Automation Status

| Status | Meaning |
| --- | --- |
| **Yes** | Automated and expected to pass. |
| **Yes — known defect** | Automated with `test.fail()` and a link to the defect. The suite reports when the defect is fixed, so the expectation gets updated instead of silently drifting. |
| **Manual** | Not automated. The reason is given in the test case. |

# Tags

Every automated test has tags, so CI and developers can run exactly the subset they need.

| Tag | Meaning | When it runs |
| --- | --- | --- |
| `@smoke` | All P0 tests: the core journeys. Fast (a few minutes). | Every commit and before every deploy |
| `@regression` | All other automated tests (P1 and P2). | Every pull request and nightly |
| `@registration` | Registration feature. | When working on that feature |
| `@search` | Product search and product details. | When working on that feature |
| `@known-defect` | Tests that document an open defect with `test.fail()`. | With `@regression`; can be listed on their own for triage |

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
that is marked with Playwright's `test.fail()`. This section explains why, how those tests are
written, what the risks are, and what happens when a defect is fixed.

## The problem

A test for a known defect fails today, and will keep failing until the application is fixed. That
leaves three bad options:

- Leave it **red**: the suite is always red, people stop looking at it, and real regressions get
  lost in the noise.
- **Skip** it: the suite is green, but nobody notices when the defect is fixed, or when it gets
  worse.
- **Don't automate** it: the defect lives only in a ticket and is forgotten.

`test.fail()` solves this: the suite stays green, the test still runs every time, and the suite
reports the moment the behaviour changes.

## What `test.fail()` does

According to the Playwright documentation:

- It marks a test as "should fail". Playwright **runs the test and checks that it actually fails**.
- Its purpose is documentation: to acknowledge that some functionality is broken until it is
  fixed.
- **If the test does not fail, Playwright reports it as a problem.** This is the signal that the
  defect has been fixed.
- The recommended form is the declaration `test.fail(title, details, body)`. Calling
  `test.fail()` inside the test body also works, but the declaration is preferred.

What that means for each run:

| Application behaviour | Test result | Report |
| --- | --- | --- |
| Defect still present (assertion fails) | Expected failure | Green, with the `issue` annotation |
| Defect fixed (assertion passes) | Unexpected pass | **Red** — "expected to fail, but passed" |

## Options considered

| Option | What happens | Decision |
| --- | --- | --- |
| `test.fail()` | Runs every time; green while the defect exists; red when it is fixed. | **Chosen** |
| `test.skip()` | Never runs. The docs describe it for tests that are irrelevant in a configuration, not for known defects. | Rejected: a fix or a change in the defect goes unnoticed |
| `test.fixme()` | Never runs. The docs describe it for tests that are slow or crash. | Rejected: same as skip |
| Assert the buggy behaviour ("characterisation test") | Green today, e.g. asserts the cart shows × 1 after adding −2. | Rejected: the code then claims the bug is *expected*; when the bug is fixed the test fails and looks like a regression |
| Keep the test failing (red) | Suite is permanently red. | Rejected: hides real regressions |
| Don't automate | Defect only in this document. | Rejected: no signal when it changes |

## Rules for writing a known-defect test

1. **Assert the correct behaviour, not the bug.** The test reads like the requirement. For
   TC-SEARCH-007 it expects the cart to still show × 3 after entering −2. When the defect is fixed,
   the test already describes the right behaviour and only the `test.fail` marker is removed.
2. **Use the declaration form**, as the documentation recommends:
   `test.fail(title, details, body)`.
3. **Link the defect** with an annotation, so the HTML report shows which defect the test tracks:
   `annotation: { type: 'issue', description: 'DEF-02: …' }`.
4. **Tag it** `@regression` and `@known-defect`, plus the feature tag. Known-defect tests are
   **never** in `@smoke`: the smoke suite must only contain tests that prove the core journeys work.
5. **One defect per test, with as few steps as possible.** Every extra step is another way for the
   test to fail for the wrong reason (see the next section).

Example (fixture and page-object names are illustrative):

```ts
test.fail(
  'TC-SEARCH-007 Quantity rejects negative values',
  {
    tag: ['@regression', '@search', '@known-defect'],
    annotation: { type: 'issue', description: 'DEF-02: negative quantity reduces the cart' },
  },
  async ({ productPage, cartPage }) => {
    await productPage.open('Blue Top');
    await productPage.addToCart(3);
    await productPage.addToCart(-2);

    await cartPage.open();
    // Correct behaviour. Today the cart shows 1, so this assertion fails as expected.
    await expect(cartPage.quantityOf('Blue Top')).toHaveText('3');
  },
);
```

## The risk: a false green

`test.fail()` is satisfied by **any** failure, not only by the defect. If a locator breaks, the
page does not load, or a fixture throws, the test still fails — and is reported green. The test
would then hide a broken test instead of tracking a defect.

**How the suite guards against this:** every step a known-defect test relies on is also covered by
an ordinary test that must pass. If shared code breaks, that ordinary test turns red, even though
the known-defect test stays green.

| Known-defect test | Defect | Steps it relies on | Guarded by |
| --- | --- | --- | --- |
| [TC-REG-008](registration.md#tc-reg-008) | DEF-01 | Create a user through the API; signup form; duplicate-email message | [TC-REG-002](registration.md#tc-reg-002) |
| [TC-SEARCH-007](product-search.md#tc-search-007) | DEF-02 | Open product page; set quantity; Add to cart; read cart | [TC-SEARCH-001](product-search.md#tc-search-001) |
| [TC-SEARCH-008](product-search.md#tc-search-008) | DEF-03 | Search through the UI; read results | [TC-SEARCH-001](product-search.md#tc-search-001), [TC-SEARCH-004](product-search.md#tc-search-004) |
| [TC-SEARCH-009](product-search.md#tc-search-009) | DEF-04 | Search through the UI; compare result names | [TC-SEARCH-003](product-search.md#tc-search-003) |
| [TC-SEARCH-011](product-search.md#tc-search-011) | DEF-05 | Type in the search field; read results heading | [TC-SEARCH-001](product-search.md#tc-search-001) |

Rule for reviewers: **a known-defect test is only trustworthy while its guard test is green.** If a
guard test is red, fix that first, then re-check the known-defect tests.

## When a defect is fixed

1. The known-defect test reports **"expected to fail, but passed"** and the run turns red.
2. Confirm the fix by hand, using the steps to reproduce in [Defects](#defects).
3. In the test, change `test.fail(` to `test(`, and remove the `@known-defect` tag and the `issue`
   annotation. No assertion needs to change, because the test already asserts the correct
   behaviour (rule 1).
4. In this folder, change the test case's status from "Yes — known defect" to "Yes", and mark the
   defect as fixed in the [Defects](#defects) table.

If the defect changes but is still wrong (for example −2 now empties the cart instead of reducing
it), the assertion still fails, the test stays green, and nothing needs to change.

## Running known-defect tests

```bash
npx playwright test --grep @known-defect          # only the known-defect tests
npx playwright test --grep-invert @known-defect   # everything except them
npx playwright test --grep @smoke                 # never includes them
```

In the HTML report, each known-defect test shows its `issue` annotation with the defect ID, so the
report doubles as a live list of open defects.

## References

- [Playwright documentation — `test.fail`](https://playwright.dev/docs/api/class-test#test-fail)
- [Playwright documentation — Annotations](https://playwright.dev/docs/test-annotations)

# Test Data and Cleanup Strategy

- **Unique data per test.** Emails are generated as
  `qa.<run-id>.<worker-index>.<random>@<domain>`. The domain is configurable. No test depends on
  data created by another test, so tests can run in any order and in parallel.
- **Set up through the API, verify through the UI.** When a scenario is not about creating an
  account (for example "email already exists"), the precondition user is created with
  `POST /api/createAccount`. This is faster and less flaky than the UI.
- **Guaranteed cleanup.** Every account created by a test is registered in a test fixture and
  deleted with `DELETE /api/deleteAccount` after the test, **even when the test fails**. Cleanup
  is not a test step, so a failure part-way through never leaves data behind. A "not found"
  response is accepted, because some tests delete the account through the UI themselves.
- **API as an independent oracle.** `POST /api/searchProduct`, `GET /api/productsList` and
  `GET /api/getUserDetailByEmail` are used to check that the UI shows the right data.
- **Expected values in data files.** Product name, price and availability are
  read from a test-data file, not hard-coded in tests.

---

# Automation Prioritisation

| Test Case | Priority | Automate | Tags |
| --- | :-: | --- | --- |
| [TC-REG-001](registration.md#tc-reg-001) Successful registration with all fields | P0 | Yes | `@smoke` `@registration` |
| [TC-REG-002](registration.md#tc-reg-002) Registration with an already registered email | P0 | Yes | `@smoke` `@registration` |
| [TC-REG-003](registration.md#tc-reg-003) New account can log out and log back in | P1 | Yes | `@regression` `@registration` |
| [TC-REG-004](registration.md#tc-reg-004) Registration with mandatory fields only | P1 | Yes | `@regression` `@registration` |
| [TC-REG-005](registration.md#tc-reg-005) Missing required account information | P1 | Yes | `@regression` `@registration` |
| [TC-REG-006](registration.md#tc-reg-006) Invalid email format on signup | P1 | Yes | `@regression` `@registration` |
| [TC-REG-007](registration.md#tc-reg-007) Empty name or email on signup | P1 | Yes | `@regression` `@registration` |
| [TC-REG-008](registration.md#tc-reg-008) Registered email in different letter case | P1 | Yes — known defect | `@regression` `@registration` `@known-defect` |
| [TC-REG-009](registration.md#tc-reg-009) Name and email carried to the account form | P2 | Yes | `@regression` `@registration` |
| [TC-REG-010](registration.md#tc-reg-010) Unicode and special characters in personal data | P2 | Yes | `@regression` `@registration` |
| [TC-REG-011](registration.md#tc-reg-011) HTML in the name is displayed as text | P2 | Yes | `@regression` `@registration` |
| [TC-SEARCH-001](product-search.md#tc-search-001) Search for a known product and add it to the cart | P0 | Yes | `@smoke` `@search` |
| [TC-SEARCH-002](product-search.md#tc-search-002) Search with no matching products | P0 | Yes | `@smoke` `@search` |
| [TC-SEARCH-003](product-search.md#tc-search-003) Search using a partial product name | P1 | Yes | `@regression` `@search` |
| [TC-SEARCH-004](product-search.md#tc-search-004) Search is case-insensitive | P1 | Yes | `@regression` `@search` |
| [TC-SEARCH-005](product-search.md#tc-search-005) Empty search returns all products | P1 | Yes | `@regression` `@search` |
| [TC-SEARCH-006](product-search.md#tc-search-006) Every result opens a matching product page | P1 | Yes | `@regression` `@search` |
| [TC-SEARCH-007](product-search.md#tc-search-007) Quantity rejects zero and negative values | P1 | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-008](product-search.md#tc-search-008) Leading spaces are ignored | P1 | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-009](product-search.md#tc-search-009) Search terms containing `&` or `#` | P1 | Yes — known defect | `@regression` `@search` `@known-defect` |
| [TC-SEARCH-010](product-search.md#tc-search-010) Script and SQL-like input is handled safely | P2 | Yes | `@regression` `@search` |
| [TC-SEARCH-011](product-search.md#tc-search-011) Pressing Enter submits the search | P2 | Yes — known defect | `@regression` `@search` `@known-defect` |

The **P0 scenarios** cover the journey most users take: register → be logged in → search →
open a product → add it to the cart. They run on every commit as the smoke suite.

### Deliberately not automated

| Area | Reason |
| --- | --- |
| Password policy and whitespace-only values | No requirement exists to assert against. Raised as a product question ([OBS-01](#observations)). |
| Visual layout and responsive design | Needs a visual-regression baseline; out of scope for functional E2E. |
| Login and Delete Account features | Not in the brief. Login is used only in TC-REG-003 to prove registration worked; accounts are deleted through the API in cleanup. |
| Firefox and WebKit on every commit | Chromium runs on every commit; other browsers are optional CI projects. |
| Ads and consent dialogs | Third-party content we don't control. Blocked at network level (see the main README). |

---

# Defects and Observations

## Defects

Every defect was reproduced at least twice through the UI (real typing and clicks), on
29 October 2026. Test accounts used for reproduction were deleted afterwards.

| ID | Severity | Summary | Covered by |
| --- | --- | --- | --- |
| DEF-01 | Major | Duplicate-email check is case-sensitive, so a second account is created | [TC-REG-008](registration.md#tc-reg-008) |
| DEF-02 | Major | Quantity `-2` reduces the cart; `0` shows a false "Added!" message | [TC-SEARCH-007](product-search.md#tc-search-007) |
| DEF-03 | Minor | Leading spaces in the search term return no results | [TC-SEARCH-008](product-search.md#tc-search-008) |
| DEF-04 | Major | Search term is not URL-encoded, so `&` and `#` break the search | [TC-SEARCH-009](product-search.md#tc-search-009) |
| DEF-05 | Minor | Pressing Enter does not submit the search | [TC-SEARCH-011](product-search.md#tc-search-011) |

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

**DEF-05 — steps to reproduce**

1. Click the search field, type `Blue Top` and press Enter.

Expected: the search runs.
Actual: nothing happens. The input is not inside a `<form>`, and only a click on the button is
handled.

## Observations

| ID | Type | Observation | Effect on the suite |
| --- | --- | --- | --- |
| OBS-01 | Product question | No password policy: password `a` is accepted. A single space passes every `required` field and is stored as the value. | Not automated; product question |
| OBS-02 | UX | No empty-state message when a search has no matches. | TC-SEARCH-002 asserts zero product cards |
| OBS-03 | Test infrastructure | The API returns HTTP 200 for every response, including errors; the real status is `responseCode` in the body. | API client checks `responseCode` |
| OBS-04 | Test infrastructure | Each product card renders its name and price twice (card and hover overlay). | Locators are scoped to one of them |
| OBS-05 | Test infrastructure | Google Ads cause three separate problems: full-screen `#google_vignette` ads that swallow clicks (seen 4 times in one session), banners that shift the layout during a click, and auto-inserted links that add text such as "Browse Clothing" to product names. | Ad domains are blocked in a fixture |
| OBS-06 | Test infrastructure | Search matches product name **and category**, but not brand: `Polo` returns 1 product, although 6 products have the brand Polo. | Result sets are compared with the API |

---

# Test Design Principles

Tests are independent and do not depend on execution order.

Every test generates its own unique data, so the suite can run repeatedly and in parallel.

Any account created by a test is deleted by a fixture after the test, whether it passed or failed.

Preconditions that are not the subject of the test are created through the API, not the UI.

Assertions verify user-visible behaviour with concrete expected values. Phrases such as "an
appropriate message" are avoided, because they cannot fail.

Assertions reflect the application's actual behaviour. Where that behaviour is wrong, the test
documents it as a known defect instead of hiding it.

Playwright role-based and `data-qa` locators and web-first assertions are used; hard-coded waits
are not.

The suite is intentionally focused on high-value scenarios rather than automating every possible
variation.
