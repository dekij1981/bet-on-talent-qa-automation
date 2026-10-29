# Automation Exercise — E2E Test Suite

End-to-end tests for user registration and product search on
[automationexercise.com](https://automationexercise.com), written with Playwright and TypeScript.

[![Playwright tests](https://github.com/dekij1981/bet-on-talent-qa-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/dekij1981/bet-on-talent-qa-automation/actions/workflows/playwright.yml)

|                  |                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Test design      | [docs/test-cases/](docs/test-cases/README.md): 22 cases, priorities, automation rules, defects |
| Automated        | 22 of 22 designed cases → 40 tests (data-driven cases expand into one test per row)            |
| Smoke (`@smoke`) | 4 tests, all P0 journeys, under 30 s                                                           |
| Full suite       | 40 tests, about 1.5 min with 2 workers                                                         |
| Known defects    | 5 defects found during exploration, tracked by 7 `test.fail()` tests                           |
| Latest report    | <https://dekij1981.github.io/bet-on-talent-qa-automation/> (GitHub Pages, from `main`)         |

## Contents

- [What is tested](#what-is-tested)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Running tests](#running-tests)
- [Configuration](#configuration)
- [Ads and pop-ups](#ads-and-pop-ups)
- [Test data and cleanup](#test-data-and-cleanup)
- [Known defects](#known-defects)
- [CI and reports](#ci-and-reports)
- [Technical decisions and trade-offs](#technical-decisions-and-trade-offs)
- [Problems found while building the suite](#problems-found-while-building-the-suite)
- [Known limitations](#known-limitations)

## What is tested

The P0 cases cover the journey most users take: **register → be logged in → search → open a
product → add it to the cart**. P1 and P2 cases cover validation, data integrity, search
semantics and input safety.

| Feature                    |             Cases             | Spec                                                   |
| -------------------------- | :---------------------------: | ------------------------------------------------------ |
| User registration          |    TC-REG-001 … TC-REG-011    | [registration.md](docs/test-cases/registration.md)     |
| Product search and details | TC-SEARCH-001 … TC-SEARCH-011 | [product-search.md](docs/test-cases/product-search.md) |

Every test title starts with its case ID (`TC-REG-001 Successful registration with all fields`),
so a failure in the report leads straight to its specification. Why each case was or wasn't
automated is recorded in the spec ([automation rules](docs/test-cases/README.md#deciding-what-to-automate)).

## Architecture

```text
src/
├── api/ApiClient.ts         Typed client for the public API; checks JSON responseCode
├── config/env.ts            The only place env vars are read, validated and defaulted
├── data/
│   ├── users.ts             UserData type, unique user builder, required-field list
│   └── products.ts          Expected product values (overridable from env), price helpers
├── fixtures/
│   ├── index.ts             mergeTests(...) → the single `test` that specs import
│   ├── ad-blocking.ts       Auto fixture: blocks ad/consent/analytics hosts per context
│   ├── api.ts               apiClient + userFactory (creates users, deletes them afterwards)
│   └── pages.ts             Page-object fixtures
├── pages/                   Page objects: locators + actions + expect* assertions
│   ├── components/Header.ts Shared header (logged-in state, logout)
│   └── form-validation.ts   Native HTML5 validity assertion
└── tests/
    ├── registration.spec.ts
    └── product-search.spec.ts
```

How the layers fit together:

```text
spec file ──uses──▶ fixtures ──provide──▶ page objects ──▶ browser
                       │
                       ├──▶ apiClient ──▶ public API (setup, oracle, cleanup)
                       └──▶ blockAds (auto, every test)
```

- **Specs** read like the test case: steps and expected results only. No `new`, no cleanup code,
  no raw HTTP.
- **Fixtures** own the lifecycle: construction, network blocking and teardown.
- **Page objects** own the locators. Assertions that belong to a page live there as `expect*`
  methods, so specs stay short and locators are never duplicated.
- **ApiClient** sets up preconditions and acts as an independent oracle (for example, the UI
  search results must equal `POST /api/searchProduct`).

## Getting started

Requirements: Node.js 20+ (CI uses the version in [.nvmrc](.nvmrc)).

```bash
npm ci
npx playwright install --with-deps chromium
cp .env.example .env    # optional: every variable has a default
```

## Running tests

| Goal                           | Command                                              |
| ------------------------------ | ---------------------------------------------------- |
| Full suite                     | `npm test`                                           |
| Headed browser                 | `npm run test:headed`                                |
| Debug step by step             | `npm run test:debug`                                 |
| UI mode                        | `npm run test:ui`                                    |
| One case                       | `npx playwright test -g "TC-SEARCH-001"`             |
| One file                       | `npx playwright test src/tests/registration.spec.ts` |
| Smoke only                     | `npm run test:smoke`                                 |
| Regression only                | `npm run test:regression`                            |
| One feature                    | `npx playwright test --grep @search`                 |
| Open defects only              | `npm run test:known-defects`                         |
| Everything except open defects | `npx playwright test --grep-invert @known-defect`    |
| Another environment            | `BASE_URL=https://staging.example.test npm test`     |
| More workers                   | `WORKERS=4 npm test`                                 |
| Open the last report           | `npm run report`                                     |

Quality checks (also run first in CI):

```bash
npm run typecheck && npm run lint && npm run format:check
```

### Tags

| Tag                         | Meaning                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `@smoke`                    | All P0 cases. Runs on every push.                               |
| `@regression`               | All other automated cases (P1, P2). Runs on PRs and nightly.    |
| `@registration` / `@search` | Feature                                                         |
| `@known-defect`             | Documents an open defect with `test.fail()`. Never in `@smoke`. |

Each test has exactly one of `@smoke` / `@regression` plus one feature tag.

## Configuration

All configuration comes from environment variables, read in
[src/config/env.ts](src/config/env.ts). A local `.env` file is loaded automatically. Real
environment variables (for example in CI) take precedence. Invalid numbers fail fast with a
clear message instead of being silently ignored.

| Variable               | Default                          | Purpose                                                              |
| ---------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `BASE_URL`             | `https://automationexercise.com` | Application under test (UI and API)                                  |
| `WORKERS`              | `2`                              | Parallel workers (≥ 1)                                               |
| `RETRIES`              | `2` in CI, otherwise `0`         | Retries per failed test                                              |
| `TEST_EMAIL_DOMAIN`    | `example.com`                    | Domain of generated test emails                                      |
| `TEST_USER_PASSWORD`   | `QaPassword123!`                 | Password of generated test users                                     |
| `PRODUCT_SEARCH_TERM`  | `Blue Top`                       | Term for the search-to-cart journey                                  |
| `PRODUCT_NAME`         | `Blue Top`                       | Expected product name                                                |
| `PRODUCT_PRICE`        | `Rs. 500`                        | Expected price                                                       |
| `PRODUCT_AVAILABILITY` | `In Stock`                       | Expected availability                                                |
| `PRODUCT_QUANTITY`     | `3`                              | Quantity added to the cart                                           |
| `CI`                   | unset                            | Set by CI: enables retries, `forbidOnly`, JUnit and GitHub reporters |

`example.com` is reserved for documentation (RFC 2606), so generated addresses can never reach
a real mailbox. In GitHub Actions, `BASE_URL` and `WORKERS` can be overridden through
repository variables.

## Ads and pop-ups

**Approach:** an automatic fixture ([ad-blocking.ts](src/fixtures/ad-blocking.ts)) aborts
every request to ad, consent and analytics hosts at the browser-context level, before any page
loads. No test has to opt in, and none can forget to.

**Why:** the site embeds Google Ads, and during exploration they caused three separate
problems ([OBS-05](docs/test-cases/README.md#observations)):

1. Full-screen `#google_vignette` ads take over the page and swallow clicks. This happened 4
   times in a single manual session.
2. Banners load late and shift the layout while Playwright is clicking.
3. Auto-ads inject links into page text, changing product names (for example "Browse Clothing"
   inside a name), which breaks text assertions.

The blocked hosts were measured, not guessed. Loading `/`, `/products`, `/login` and a product
page produced requests to `fundingchoicesmessages.google.com` (60, consent),
`pagead2.googlesyndication.com` (47, ad script), `googleads.g.doubleclick.net` (12),
`ep1/ep2.adtrafficquality.google` (20) and `static.cloudflareinsights.com` (4). With the fixture
active, only the ad script and the analytics beacon are requested and aborted. Because the ad
script never runs, none of the follow-up ad or consent requests are made at all.

**Alternatives considered:**

| Option                                                    | Why not                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Close pop-ups when they appear (`page.addLocatorHandler`) | Reacts after the ad has loaded. Layout shifts and injected text still happen. |
| Retry flaky steps                                         | Hides the cause and slows the suite.                                          |
| Remove ad elements with injected CSS/JS                   | Fragile: depends on Google's markup, which we don't control.                  |
| `page.route` in each test                                 | Easy to forget. Does not cover pop-ups or new tabs an ad opens.               |

**Trade-off:** the suite tests the site _without_ ads, which is what we control and what the
brief is about. Ad rendering is third-party content and is deliberately out of scope.

## Test data and cleanup

- **Unique data.** Emails follow `qa.<run-id>.<worker-index>.<random>@<domain>`. The run ID is
  `GITHUB_RUN_ID` in CI, so a leftover account can be traced back to its run. Tests share no
  data and can run in any order and in parallel.
- **API for preconditions, UI for the subject.** When a test is not _about_ creating an account
  (for example "email already exists"), the account is created through `POST /api/createAccount`.
- **Guaranteed cleanup.** The `userFactory` fixture registers every account a test builds or
  creates. After the test, whether it passed or failed, its teardown deletes each one through
  `DELETE /api/deleteAccount`. `404` is accepted, because the account may never have been
  created (for example, a validation test). Any other response fails the test, so leaks are
  visible. TC-REG-008 also registers the uppercase duplicate that the defect lets through.
- **The API always answers HTTP 200** ([OBS-03](docs/test-cases/README.md#observations)), even
  for errors. `ApiClient` therefore checks `responseCode` in the JSON body, and treats a non-2xx
  HTTP status as a server failure.
- **Cart isolation.** Every test gets a fresh browser context, so the cart always starts empty.
- **Expected values** for the main product live in [src/data/products.ts](src/data/products.ts)
  and can be overridden from the environment.

## Known defects

Exploration found five defects. Each one is automated as a `test.fail()` test that asserts the
**correct** behaviour, so the suite is green while the defect exists and turns red the moment it
is fixed. The full reasoning, the rejected alternatives and the procedure for a fix are in
[How Known Defects Are Automated](docs/test-cases/README.md#how-known-defects-are-automated).

| Defect | Summary                                                    | Test          | Guard test    |
| ------ | ---------------------------------------------------------- | ------------- | ------------- |
| DEF-01 | Duplicate-email check is case-sensitive                    | TC-REG-008    | TC-REG-002    |
| DEF-02 | Quantity `-2` reduces the cart; `0` shows a false "Added!" | TC-SEARCH-007 | TC-SEARCH-001 |
| DEF-03 | Leading spaces break the search                            | TC-SEARCH-008 | TC-SEARCH-001 |
| DEF-04 | Search term not URL-encoded (`&`, `#`)                     | TC-SEARCH-009 | TC-SEARCH-003 |
| DEF-05 | Enter does not submit the search                           | TC-SEARCH-011 | TC-SEARCH-001 |

How they are written:

```ts
test.fail(
  'TC-SEARCH-011 Pressing Enter submits the search',
  {
    tag: ['@regression', '@search', '@known-defect'],
    annotation: { type: 'issue', description: 'DEF-05: Enter does not submit the search' },
  },
  async ({ productsPage }) => {
    await productsPage.open();
    await productsPage.pressEnterToSearch('Blue Top');
    await productsPage.expectSearchResults(); // correct behaviour; fails today
  },
);
```

`test.fail()` accepts _any_ failure, so a broken locator could hide behind it. Two safeguards
prevent that:

- Every step a known-defect test relies on is also covered by a normal **guard test** (table
  above). A known-defect test is only trustworthy while its guard is green.
- Each one was checked to fail on the defect assertion itself, not on setup or a locator.

DEF-02 needed extra care. With quantity `0` the cart is (correctly) unchanged, and the defect is
only the false "Added!" message. Checking that a modal is _not_ shown right after a click is a
race, so the test first waits for jQuery's AJAX counter (`jQuery.active === 0`), which drops only
after the success callback that opens the modal has run. The modal check is `expect.soft`, so for
`-2` the report shows both symptoms: the false message and the reduced cart.

## CI and reports

Workflow: [.github/workflows/playwright.yml](.github/workflows/playwright.yml)

| Trigger                      | Runs                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `push` (any branch)          | Quality checks → `@smoke`                                    |
| `pull_request`               | Quality checks → full suite                                  |
| Nightly (03:00 UTC)          | Quality checks → full suite                                  |
| Manual (`workflow_dispatch`) | Quality checks → optional `grep` filter, full suite if empty |

```text
quality (typecheck, lint, format) ──▶ test (Chromium) ──▶ deploy-report (main only)
```

- `quality` runs first and fails fast, before any browser is installed.
- npm dependencies are cached by `actions/setup-node`. Chromium is installed with OS
  dependencies.
- In CI, failed tests are retried twice and a trace is recorded on the first retry
  (`trace: 'on-first-retry'`), so traces exist exactly when they are useful. Screenshots and
  video are kept for failures.
- Reporters: `list` (log), `html`, `junit` (`reports/junit.xml`) and `github` (inline
  annotations on the PR).

**Where to find the report:**

- Every run: **Actions → run → Artifacts → `playwright-report`** (HTML, 14 days) and
  `test-results` (traces, screenshots, JUnit, 7 days).
- Latest `main` run: **GitHub Pages** at
  <https://dekij1981.github.io/bet-on-talent-qa-automation/>. Failed runs are published too,
  since that is when the report matters most.

One-time repository setup: **Settings → Pages → Source: GitHub Actions**.

## Technical decisions and trade-offs

| Decision                                       | Reason                                                                                                                                                                                           | Trade-off                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Page objects provided as fixtures              | Specs declare what they need. Construction and lifecycle live in one place.                                                                                                                      | One more layer to learn                                                             |
| Cleanup in fixture teardown                    | Runs even when the test fails. Tests contain no cleanup code.                                                                                                                                    | Cleanup is less visible when reading a single test                                  |
| Locators: `data-qa` → role/label → id          | `data-qa` is a contract with developers and survives styling changes. Ids are used only where the site offers nothing better (icon-only search button, quantity input whose label isn't linked). | Some CSS classes remain where the site has no other hook (cart cells, result cards) |
| API as oracle for search                       | The UI must match `POST /api/searchProduct`. Tests keep working if the catalogue changes.                                                                                                        | Trusts the API to apply the same rule as the UI                                     |
| Web-first assertions only, no `waitForTimeout` | Auto-retrying assertions wait exactly as long as needed                                                                                                                                          | —                                                                                   |
| `waitForURL` after navigating clicks           | Waits for the `load` event, so scripts at the end of `<body>` have bound their handlers ([why](#problems-found-while-building-the-suite))                                                        | —                                                                                   |
| Type-aware ESLint (`no-floating-promises`)     | A missing `await` is the most common source of false-passing Playwright tests                                                                                                                    | Slower lint                                                                         |
| Data-driven tests with the value in the title  | One failing row is visible on its own in the report                                                                                                                                              | More tests in the count (40 for 22 cases)                                           |
| 2 workers by default                           | Shared public demo site; more parallelism risks rate limiting                                                                                                                                    | Slower than the machine allows                                                      |
| Chromium only                                  | Fast and enough for functional coverage                                                                                                                                                          | No Firefox or WebKit coverage (see limitations)                                     |

## Problems found while building the suite

**Intermittent "Add to cart does nothing" (4 failures in 10 runs).** In failing runs, the
`/add_to_cart` request was never sent. The site loads `cart.js` at the end of `<body>`, and that
script binds the click handler when it executes. A click on "View Product" only waits for the
navigation to _commit_. The product name and price are already in the HTML, so the assertions
passed and the test clicked "Add to cart" before the handler existed. Fix: `waitForURL()` after
the click, which waits for the `load` event by default. Result: 20 of 20 runs passed. A sleep
would also have "worked", but it would only hide the race.

**Reading results from the previous page.** The search button sets `window.location`, so after
the click the old page is still there for a moment. `search()` therefore waits for the results
URL of _this_ term (and its `load` event) before anything reads the results.

**A wait that would have hidden a fix.** The first version waited for the exact URL the site
builds today, `'/products?search=' + term` without encoding (DEF-04), e.g.
`?search=Blue%20&%20Pink`. That is correct today, but once DEF-04 is fixed the site sends
`?search=Blue%20%26%20Pink`, the wait would time out, and the TC-SEARCH-009 `test.fail()` would
stay green forever: a false green. `isSearchResultsUrl()` now accepts both the current raw form
and any correctly encoded form (`%20` or `+`). This was verified by replacing the site's click
handler in the browser with an encoding one: the search completes and the result assertion
passes, which is exactly what makes `test.fail()` report the fix.

**Search matches categories too.** "Every result contains the term" is false for `top`: two
shirts match through their category _Tops & Shirts_. The tests use the real rule (name or
category) and compare against the API instead of asserting a rule the product doesn't have.

## Known limitations

- **Shared public environment.** The site is a public demo with no SLA. Downtime or catalogue
  changes affect the suite. Product expectations are configurable, and search assertions use
  the API as oracle to reduce the impact. Under heavy load it was seen answering HTTP 503 and
  stalling page loads (two suites run in parallel against it). The default of 2 workers and
  the CI retries exist for this reason; a 503 is reported as a server failure, not hidden.
- **Chromium only.** Firefox and WebKit are not run. Adding them is a `projects` entry in
  [playwright.config.ts](playwright.config.ts) and a CI matrix.
- **Ads are not tested.** They are blocked on purpose (see [Ads and pop-ups](#ads-and-pop-ups)).
  A change on the site that depends on the blocked hosts would not be noticed.
- **Some locators depend on CSS classes** (`.productinfo`, `.cart_quantity`) because the site
  has no `data-qa` or accessible names there.
- **TC-SEARCH-007 relies on jQuery internals** (`jQuery.active`) to know when the add-to-cart
  call has finished. If the site drops jQuery, this wait must change.
- **Mobile number is not verified through the API,** because `GET /api/getUserDetailByEmail`
  does not return it.
- **Not automated by design:** password policy (no requirement exists, OBS-01), visual layout,
  and login/delete-account as features of their own. See
  [Deliberately not automated](docs/test-cases/README.md#deliberately-not-automated).
- **GitHub Pages shows only the latest `main` run.** Older reports are available as artifacts
  for 14 days.
