# Automation Exercise — E2E Test Suite

End-to-end tests for user registration and product search on
[automationexercise.com](https://automationexercise.com), written with Playwright and TypeScript.

[![Playwright tests](https://github.com/dekij1981/bet-on-talent-qa-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/dekij1981/bet-on-talent-qa-automation/actions/workflows/playwright.yml)

|                  |                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Test design      | [docs/test-cases/](docs/test-cases/README.md): 22 cases, priorities, automation rules, defects |
| Automated        | 22 of 22 designed cases → 40 tests (data-driven cases run once per data row)                   |
| Smoke (`@smoke`) | 4 tests, all P0 journeys, under 30 s                                                           |
| Full suite       | 40 tests, about 1.5 min locally and 1 min in CI, with 2 workers                                |
| Known defects    | 5 found during exploration, tracked by 7 `test.fail()` tests                                   |
| Latest report    | <https://dekij1981.github.io/bet-on-talent-qa-automation/> (from `main`)                       |

## Contents

- [Quick start](#quick-start)
- [Running tests](#running-tests)
- [Configuration](#configuration)
- [What is tested](#what-is-tested)
- [Architecture](#architecture)
- [Reliability](#reliability)
- [Known defects](#known-defects)
- [CI and reports](#ci-and-reports)
- [Debugging a failure](#debugging-a-failure)
- [Technical decisions and trade-offs](#technical-decisions-and-trade-offs)
- [Lessons from building the suite](#lessons-from-building-the-suite)
- [Known limitations](#known-limitations)

## Quick start

Requirements: Node.js 20 or newer (CI uses the version in [.nvmrc](.nvmrc)).

```bash
git clone https://github.com/dekij1981/bet-on-talent-qa-automation.git
cd bet-on-talent-qa-automation
npm ci
npx playwright install --with-deps chromium
npm test
```

No `.env` file is needed: every setting has a default. To change one, copy
[.env.example](.env.example) to `.env` (see [Configuration](#configuration)).

## Running tests

| Goal                           | Command                                              |
| ------------------------------ | ---------------------------------------------------- |
| Full suite                     | `npm test`                                           |
| Smoke only                     | `npm run test:smoke`                                 |
| Regression only                | `npm run test:regression`                            |
| One feature                    | `npx playwright test --grep @search`                 |
| One case                       | `npx playwright test -g "TC-SEARCH-001"`             |
| One file                       | `npx playwright test src/tests/registration.spec.ts` |
| Open defects only              | `npm run test:known-defects`                         |
| Everything except open defects | `npx playwright test --grep-invert @known-defect`    |
| Headed browser                 | `npm run test:headed`                                |
| Debug step by step             | `npm run test:debug`                                 |
| UI mode                        | `npm run test:ui`                                    |
| Another environment            | `BASE_URL=https://staging.example.test npm test`     |
| More workers                   | `WORKERS=4 npm test`                                 |
| Open the last report           | `npm run report`                                     |

Quality checks, which also run first in CI:

```bash
npm run typecheck && npm run lint && npm run format:check
```

### Tags

Each test has exactly one of `@smoke` or `@regression`, plus one feature tag.

| Tag                        | Meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `@smoke`                   | All P0 cases. Runs on every push.                                      |
| `@regression`              | All other automated cases (P1, P2). Runs on pull requests and nightly. |
| `@registration`, `@search` | Feature                                                                |
| `@known-defect`            | Documents an open defect with `test.fail()`. Never in `@smoke`.        |

## Configuration

All settings come from environment variables, read and validated in one place:
[src/config/env.ts](src/config/env.ts). A local `.env` file is loaded automatically; real
environment variables (for example in CI) take precedence. An invalid number fails the run with
a clear message instead of being silently ignored.

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

`example.com` is reserved for documentation (RFC 2606), so a generated address can never reach a
real mailbox. In GitHub Actions, `BASE_URL` and `WORKERS` can be set as repository variables.

## What is tested

The P0 cases cover the journey most users take: **register → be logged in → search → open a
product → add it to the cart**. P1 and P2 cases cover validation, data integrity, search
behaviour and input safety.

| Feature                    |             Cases             | Spec                                                   |
| -------------------------- | :---------------------------: | ------------------------------------------------------ |
| User registration          |    TC-REG-001 … TC-REG-011    | [registration.md](docs/test-cases/registration.md)     |
| Product search and details | TC-SEARCH-001 … TC-SEARCH-011 | [product-search.md](docs/test-cases/product-search.md) |

Every test title starts with its case ID, for example
`TC-REG-001 Successful registration with all fields`, so a failure in the report leads straight
to its specification. The reason each case is or isn't automated is recorded in the spec
([automation rules](docs/test-cases/README.md#deciding-what-to-automate)).

## Architecture

```text
src/
├── api/ApiClient.ts         Typed client for the public API; checks the JSON responseCode
├── config/env.ts            The only place env vars are read, validated and defaulted
├── data/
│   ├── users.ts             UserData type, unique user builder, list of required fields
│   └── products.ts          Expected product values (overridable from env), price helpers
├── fixtures/
│   ├── index.ts             mergeTests(...) → the single `test` that specs import
│   ├── ad-blocking.ts       Auto fixture: blocks ad, consent and analytics hosts
│   ├── api.ts               apiClient + userFactory (creates users, deletes them afterwards)
│   └── pages.ts             Page-object fixtures
├── pages/                   Page objects: locators, actions and expect* assertions
│   ├── components/Header.ts Shared header (logged-in state, logout)
│   └── form-validation.ts   Native HTML5 validity assertion
└── tests/
    ├── registration.spec.ts
    └── product-search.spec.ts
```

```text
spec ──uses──▶ fixtures ──provide──▶ page objects ──▶ browser
                  │
                  ├──▶ apiClient ──▶ public API (setup, oracle, cleanup)
                  └──▶ blockAds (automatic, every test)
```

- **Specs** read like the test case: steps and expected results only. No `new`, no cleanup code,
  no raw HTTP.
- **Fixtures** own the lifecycle: construction, network blocking and teardown.
- **Page objects** own the locators. Assertions that belong to a page live there as `expect*`
  methods, so specs stay short and no locator is defined twice.
- **ApiClient** creates preconditions and acts as an independent oracle: for example, the UI
  search results must equal `POST /api/searchProduct`.

## Reliability

### Ads and pop-ups

An automatic fixture ([ad-blocking.ts](src/fixtures/ad-blocking.ts)) aborts every request to ad,
consent and analytics hosts at the browser-context level, before any page loads. No test has to
opt in, and none can forget to. Routing on the context, not the page, also covers pop-ups and new
tabs that an ad opens.

The site embeds Google Ads, and during exploration they caused three separate problems
([OBS-05](docs/test-cases/README.md#observations)):

1. Full-screen `#google_vignette` ads take over the page and swallow clicks (4 times in one
   manual session).
2. Banners load late and shift the layout while Playwright is clicking.
3. Auto-ads inject links into page text and change product names (for example "Browse Clothing"
   inside a name), which breaks text assertions.

The blocked hosts were measured, not guessed. Loading `/`, `/products`, `/login` and a product
page produced requests to `fundingchoicesmessages.google.com` (60, consent),
`pagead2.googlesyndication.com` (47, ad script), `googleads.g.doubleclick.net` (12),
`ep1/ep2.adtrafficquality.google` (20) and `static.cloudflareinsights.com` (4). With the fixture
active, only the ad script and the analytics beacon are requested, and both are aborted. Because
the ad script never runs, none of its follow-up requests are made.

| Alternative                                               | Why not                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Close pop-ups when they appear (`page.addLocatorHandler`) | Reacts after the ad has loaded; layout shifts and injected text still happen |
| Retry flaky steps                                         | Hides the cause and slows the suite                                          |
| Hide ad elements with injected CSS or JS                  | Depends on Google's markup, which we don't control                           |
| `page.route` in each test                                 | Easy to forget; does not cover pop-ups or new tabs                           |

**Trade-off:** the suite tests the site _without_ ads. Ads are third-party content outside the
brief and are deliberately out of scope.

### Waiting

- Only web-first assertions, which retry until the condition is met. No `waitForTimeout` and no
  `expect(await locator.isVisible())`.
- After a click that navigates, `waitForURL()` waits for the `load` event, so scripts at the end
  of `<body>` have bound their handlers ([why](#lessons-from-building-the-suite)).
- Type-aware ESLint with `no-floating-promises` catches a missing `await`, the most common cause
  of a Playwright test that passes when it shouldn't.

### Test data and cleanup

- **Unique data.** Emails follow `qa.<run-id>.<worker-index>.<random>@<domain>`. In CI the run ID
  is `GITHUB_RUN_ID`, so a leftover account can be traced back to its run. Tests share no data
  and run in any order and in parallel.
- **API for preconditions, UI for the subject.** When a test is not _about_ creating an account
  (for example "email already exists"), the account is created through `POST /api/createAccount`.
- **Guaranteed cleanup.** The `userFactory` fixture registers every account a test builds or
  creates. After the test, passed or failed, its teardown deletes each one through
  `DELETE /api/deleteAccount`. A `404` is accepted, because the account may never have been
  created (for example in a validation test). Any other response fails the test, so leaks are
  visible. This was verified with a test that fails on purpose: its account was gone afterwards.
- **Real API status.** The API answers HTTP 200 for everything, including errors
  ([OBS-03](docs/test-cases/README.md#observations)), so `ApiClient` checks `responseCode` in the
  JSON body. A non-2xx status, or an HTML page instead of JSON, is reported as a server failure
  with the URL, status and page title.
- **Cart isolation.** Every test gets a fresh browser context, so the cart always starts empty.

### Stability evidence

| Check                                              | Result                                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full suite, 3 × `--repeat-each=3` (360 executions) | 352 passed; all 8 failures fell in two short windows when the public site degraded (HTTP 503, page loads not finishing within 30 s, passing tests 4–6× slower in the same minutes) |
| Fresh clone of `main`, no `.env`                   | 40 passed                                                                                                                                                                          |
| CI full suite (pull request)                       | 40 passed in about 1 min                                                                                                                                                           |

No failure was traced to test logic, so timeouts were not raised: that would only hide an
unavailable site. Retries exist in CI as a safety net.

## Known defects

Exploration found five defects. Each is automated as a `test.fail()` test that asserts the
**correct** behaviour: the suite stays green while the defect exists and turns red the moment it
is fixed. The reasoning, the rejected alternatives and the procedure for a fix are in
[How Known Defects Are Automated](docs/test-cases/README.md#how-known-defects-are-automated).

| Defect | Summary                                                    | Test          | Guard test    |
| ------ | ---------------------------------------------------------- | ------------- | ------------- |
| DEF-01 | Duplicate-email check is case-sensitive                    | TC-REG-008    | TC-REG-002    |
| DEF-02 | Quantity `-2` reduces the cart; `0` shows a false "Added!" | TC-SEARCH-007 | TC-SEARCH-001 |
| DEF-03 | Leading spaces break the search                            | TC-SEARCH-008 | TC-SEARCH-001 |
| DEF-04 | Search term not URL-encoded (`&`, `#`)                     | TC-SEARCH-009 | TC-SEARCH-003 |
| DEF-05 | Enter does not submit the search                           | TC-SEARCH-011 | TC-SEARCH-001 |

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

`test.fail()` accepts _any_ failure, so a broken locator could hide behind it. Three safeguards:

- **Guard tests.** Every step a known-defect test relies on is also covered by an ordinary test
  (table above). A known-defect test is only trustworthy while its guard is green.
- **Checked failure point.** Each known-defect test was checked to fail on the defect assertion
  itself, not on setup or a locator.
- **No waits that only work while the defect exists.** For example, `search()` accepts both the
  unencoded URL the site builds today and a correctly encoded one, so after a fix of DEF-04 the
  test completes and reports the fix instead of timing out
  ([details](#lessons-from-building-the-suite)).

DEF-02 needed extra care. With quantity `0` the cart is correctly unchanged, and the defect is
only the false "Added!" message. Checking that a modal is _not_ shown right after a click is a
race, so the test first waits for jQuery's AJAX counter (`jQuery.active === 0`), which drops only
after the callback that opens the modal has run. The modal check uses `expect.soft`, so for `-2`
the report shows both symptoms: the false message and the reduced cart.

## CI and reports

Workflow: [.github/workflows/playwright.yml](.github/workflows/playwright.yml)

```text
quality (typecheck, lint, format) ──▶ test (Chromium) ──▶ deploy-report (main only)
```

| Trigger                      | Runs                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `push` (any branch)          | Quality checks → `@smoke`                                     |
| `pull_request`               | Quality checks → full suite                                   |
| Nightly (03:00 UTC)          | Quality checks → full suite                                   |
| Manual (`workflow_dispatch`) | Quality checks → optional `grep` filter (full suite if empty) |

- `quality` runs first and fails fast, before any browser is installed.
- npm dependencies are cached by `actions/setup-node`; Chromium is installed with OS
  dependencies.
- Before the tests, a diagnostic step records what the runner receives from the site (status,
  page title, whether the API returns JSON) as an annotation. It never fails the job, but it
  shows at a glance whether a red run is caused by the site or by the tests.
- Failed tests are retried twice, and a trace is recorded on the first retry
  (`trace: 'on-first-retry'`), so traces exist exactly when they are useful. Screenshots and
  video are kept for failures.
- Reporters: `list` (log), `html`, `junit` (`reports/junit.xml`) and `github` (inline
  annotations on pull requests).

**Where to find the report:**

- **Latest `main` run:** GitHub Pages, <https://dekij1981.github.io/bet-on-talent-qa-automation/>.
  Failed runs are published too, since that is when the report matters most.
- **Every run:** Actions → run → Artifacts → `playwright-report` (HTML, kept 14 days) and
  `test-results` (traces, screenshots, JUnit, kept 7 days).

Only `main` publishes to GitHub Pages, so the public report always reflects the `main` branch.
Branches and pull requests still get the full HTML report as a downloadable artifact on every
run.

To set this up in a fork: **Settings → Pages → Source: GitHub Actions**.

## Debugging a failure

| Situation                    | What to do                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failed locally               | `npm run report` opens the HTML report with screenshot and video of the failure                                                                      |
| Need a trace locally         | `npx playwright test -g "TC-…" --trace on`, then open it from the report                                                                             |
| Step through a test          | `npm run test:debug` or `npm run test:ui`                                                                                                            |
| Failed in CI                 | Download `playwright-report` from the run; retried tests include a trace                                                                             |
| Many tests red in CI at once | Check the "Site reachable" annotation first: the site may be down or not serving the app to the runner                                               |
| A known-defect test is red   | "Expected to fail, but passed" means the defect is probably fixed: follow [When a defect is fixed](docs/test-cases/README.md#when-a-defect-is-fixed) |

## Technical decisions and trade-offs

| Decision                              | Reason                                                                     | Trade-off                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Page objects provided as fixtures     | Specs declare what they need; construction and lifecycle live in one place | One more layer to learn                                                                                            |
| Cleanup in fixture teardown           | Runs even when the test fails; tests contain no cleanup code               | Cleanup is less visible when reading one test                                                                      |
| Locators: `data-qa` → role/label → id | `data-qa` is a contract with developers and survives styling changes       | Ids for the icon-only search button and the unlabelled quantity input; CSS classes where the site has nothing else |
| API as oracle for search              | Tests keep working when the catalogue changes                              | Trusts the API to apply the same rule as the UI                                                                    |
| Data-driven tests, value in the title | One failing data row is visible on its own                                 | 40 tests for 22 cases                                                                                              |
| 2 workers by default                  | Shared public site; more load caused 503s                                  | Slower than the machine allows                                                                                     |
| Chromium only                         | Fast and enough for functional coverage                                    | No Firefox or WebKit coverage                                                                                      |

## Lessons from building the suite

**"Add to cart" sometimes did nothing (4 failures in 10 runs).** In failing runs the
`/add_to_cart` request was never sent. The site loads `cart.js` at the end of `<body>`, and that
script binds the click handler when it runs. A click on "View Product" only waits for the
navigation to _commit_. Name and price are already in the HTML, so the assertions passed and the
test clicked "Add to cart" before the handler existed. Fix: `waitForURL()` after the click, which
waits for the `load` event. Result: 20 of 20 runs passed. A sleep would also have "worked", but
only by hiding the race.

**Reading results from the previous page.** The search button sets `window.location`, so after
the click the old page stays on screen for a moment. `search()` waits for the results URL of
_this_ term, and its `load` event, before anything reads the results.

**A wait that would have hidden a fix.** The first version of `search()` waited for the exact URL
the site builds today: `'/products?search=' + term`, not encoded (DEF-04), e.g.
`?search=Blue%20&%20Pink`. Once DEF-04 is fixed, the site sends `?search=Blue%20%26%20Pink`, the
wait would time out, and the TC-SEARCH-009 `test.fail()` would stay green forever.
`isSearchResultsUrl()` now accepts the current form and any correctly encoded one (`%20` or `+`).
Verified by replacing the site's click handler in the browser with an encoding one: the search
completes and the result assertion passes, which is exactly what makes `test.fail()` report the
fix.

**Search matches categories too.** "Every result contains the term" is false for `top`: two
shirts match through their category _Tops & Shirts_. The tests use the real rule (name or
category) and compare with the API, instead of asserting a rule the product doesn't have.

**The first CI run failed while the same commit passed locally.** The runner received HTML that
was not the application, for both the UI and the API. The cause could not be confirmed
afterwards, so instead of guessing, the next failure was made to explain itself: the API client
reports what arrived instead of JSON, and CI records what the runner receives from the site. The
next run was green and the site was reachable.

## Known limitations

- **Shared public environment.** The site is a public demo with no SLA; downtime, load or
  catalogue changes affect the suite. Under load it was seen answering HTTP 503 and not
  finishing page loads. Product expectations are configurable, search assertions use the API as
  oracle, and CI retries absorb short outages.
- **Chromium only.** Firefox and WebKit are not run. Adding them is a `projects` entry in
  [playwright.config.ts](playwright.config.ts) and a CI matrix.
- **Ads are not tested.** They are blocked on purpose (see [Ads and pop-ups](#ads-and-pop-ups)).
  A feature that depends on the blocked hosts would not be noticed.
- **Some locators use CSS classes** (`.productinfo`, `.cart_quantity`), because the site has no
  `data-qa` or accessible names there.
- **TC-SEARCH-007 relies on jQuery** (`jQuery.active`) to know when the add-to-cart call has
  finished. If the site drops jQuery, this wait must change.
- **The mobile number is not verified through the API,** because
  `GET /api/getUserDetailByEmail` does not return it.
- **Not automated by design:** password policy (no requirement exists, OBS-01), visual layout,
  and login and account deletion as features of their own. See
  [Deliberately not automated](docs/test-cases/README.md#deliberately-not-automated).
- **GitHub Pages shows only the latest `main` run.** Older reports are kept as artifacts for 14
  days.
