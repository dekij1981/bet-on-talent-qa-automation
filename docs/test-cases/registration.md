# User Registration — Test Cases

[← Back to overview](README.md)

## Flow Under Test

```text
/login            "New User Signup!"  →  enter name and email  →  Signup
/signup           "Enter Account Information"  →  fill the form  →  Create Account
/account_created  "Account Created!"  →  Continue
/                 header shows "Logged in as <name>"
```

## Summary

| ID                        | Title                                           | Priority | Automation         | Tags                                          |
| ------------------------- | ----------------------------------------------- | :------: | ------------------ | --------------------------------------------- |
| [TC-REG-001](#tc-reg-001) | Successful registration with all fields         |    P0    | Yes                | `@smoke` `@registration`                      |
| [TC-REG-002](#tc-reg-002) | Registration with an already registered email   |    P0    | Yes                | `@smoke` `@registration`                      |
| [TC-REG-003](#tc-reg-003) | New account can log out and log back in         |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-004](#tc-reg-004) | Registration with mandatory fields only         |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-005](#tc-reg-005) | Missing required account information            |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-006](#tc-reg-006) | Invalid email format on signup                  |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-007](#tc-reg-007) | Empty name or email on signup                   |    P1    | Yes                | `@regression` `@registration`                 |
| [TC-REG-008](#tc-reg-008) | Registered email in different letter case       |    P1    | Yes — known defect | `@regression` `@registration` `@known-defect` |
| [TC-REG-009](#tc-reg-009) | Name and email carried to the account form      |    P2    | Yes                | `@regression` `@registration`                 |
| [TC-REG-010](#tc-reg-010) | Unicode and special characters in personal data |    P2    | Yes                | `@regression` `@registration`                 |
| [TC-REG-011](#tc-reg-011) | HTML in the name is displayed as text           |    P2    | Yes                | `@regression` `@registration`                 |

> **Cleanup for every test case:** each account a test creates is deleted through
> `DELETE /api/deleteAccount` in fixture teardown, whether the test passed or failed (see
> [Test Data and Cleanup Strategy](README.md#test-data-and-cleanup-strategy)). Cleanup is therefore
> not listed as a test step.

> **Test data:** profile values come from the test data configuration (built-in defaults shown
> below, overridable with `TEST_DATA_FILE`). Name and email are generated for every test.

---

<a id="tc-reg-001"></a>

## TC-REG-001 — Successful registration with all fields

Priority: P0  
Automation: Yes  
Tags: `@smoke` `@registration`  
Why automated: Main onboarding journey; runs every release; clear expected result

### Objective

Verify that a new user can create an account with every field filled in, is logged in
automatically, and that the entered data is stored correctly. This is the main onboarding journey.

### Preconditions

- A unique email address that does not exist yet.

### Test Data

| Field                        | Value                                                     |
| ---------------------------- | --------------------------------------------------------- |
| Name                         | generated, e.g. `QA User <id>`                            |
| Email                        | generated: `qa.<run-id>.<worker-index>.<random>@<domain>` |
| Password                     | `TEST_USER_PASSWORD`                                      |
| Title                        | Mr                                                        |
| Date of birth                | 5 March 1990                                              |
| Newsletter, Special offers   | ticked                                                    |
| First name / Last name       | Qa / Tester                                               |
| Company, Address, Address 2  | Test Company / Test Street 1 / Apartment 1                |
| Country                      | Canada (must not be the form default, India)              |
| State, City, Zipcode, Mobile | Ontario / Toronto / M5V2T6 / 5551234567                   |

### Steps

1. Open the home page and click **Signup / Login** in the header.
2. In **New User Signup!**, enter the name and email and click **Signup**.
3. Fill in every field of the account and address form with the test data.
4. Click **Create Account**.
5. Click **Continue**.

### Expected Result

- After step 1: the URL is `/login` and **New User Signup!** is visible.
- After step 2: the **Enter Account Information** form is displayed.
- After step 4: the URL is `/account_created` and the heading **Account Created!** is visible.
- After step 5:
  - the header shows **Logged in as \<name\>**
  - the **Logout** and **Delete Account** links are visible
  - the **Signup / Login** link is not visible
- `GET /api/getUserDetailByEmail` returns the same first name, last name, address, country, state,
  city and zipcode that were entered.

---

<a id="tc-reg-002"></a>

## TC-REG-002 — Registration with an already registered email

Priority: P0  
Automation: Yes  
Tags: `@smoke` `@registration`  
Why automated: Required by the brief; high risk of duplicate accounts; cheap with API setup

### Objective

Verify that the application prevents a second account from being created with an email that
already belongs to an existing account.

### Preconditions

- A user with email _E_ is created through `POST /api/createAccount`.

### Steps

1. Open `/login`.
2. In **New User Signup!**, enter a different name and email _E_.
3. Click **Signup**.

### Expected Result

- The message **Email Address already exist!** is shown in the signup form.
- The URL stays `/signup` and the **Enter Account Information** form is not displayed.
- The existing account is unchanged: `POST /api/verifyLogin` with the original password still
  returns "User exists!".

### Notes

The precondition user is created through the API because this test is about rejecting the
duplicate, not about creating an account.

---

<a id="tc-reg-003"></a>

## TC-REG-003 — New account can log out and log back in

Priority: P1  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Proves the stored credentials work; cheap once the registration flow is automated

### Objective

Verify that the credentials chosen during registration actually work. "Account Created!" has no
value if the user cannot log in again.

### Steps

1. Register a new account through the UI (as in TC-REG-001, mandatory fields only).
2. Click **Logout**.
3. On `/login`, log in with the same email and password.

### Expected Result

- After step 2: the header shows **Signup / Login** and no longer shows **Logged in as**.
- After step 3: the header shows **Logged in as \<name\>**.

---

<a id="tc-reg-004"></a>

## TC-REG-004 — Registration with mandatory fields only

Priority: P1  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Common real-user path; same page objects as TC-REG-001

### Objective

Verify that optional fields are really optional. Most users skip them.

### Steps

1. Complete the signup step with a unique name and email.
2. Fill in only the mandatory fields: Password, First name, Last name, Address, State, City,
   Zipcode, Mobile number. Leave Title, Date of birth, both checkboxes, Company and Address 2
   empty and keep the default country.
3. Click **Create Account**, then **Continue**.

### Expected Result

- **Account Created!** is displayed.
- After **Continue**, the header shows **Logged in as \<name\>**.

---

<a id="tc-reg-005"></a>

## TC-REG-005 — Missing required account information

Priority: P1  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: One data-driven test covers 8 fields; tedious and error-prone manually

### Objective

Verify that registration cannot be completed when a required field is empty, and that no partial
account is created.

### Test Data

One test run per required field, with only that field left empty:

| Run | Empty field   |
| :-: | ------------- |
|  1  | Password      |
|  2  | First name    |
|  3  | Last name     |
|  4  | Address       |
|  5  | State         |
|  6  | City          |
|  7  | Zipcode       |
|  8  | Mobile number |

### Steps

1. Complete the signup step with a unique name and email.
2. Fill in every required field except the one under test.
3. Click **Create Account**.

### Expected Result

- The form is not submitted; the URL never changes to `/account_created`.
- The empty field is marked invalid (`:invalid` with a non-empty `validationMessage`).
- `GET /api/getUserDetailByEmail` returns `responseCode: 404`, so no partial account exists.

### Notes

Validation is native HTML5 (`required`). Tests check the field's validity state rather than the
message text, because the text differs between browsers.

---

<a id="tc-reg-006"></a>

## TC-REG-006 — Invalid email format on signup

Priority: P1  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Data-driven; fast; deterministic browser validation

### Objective

Verify that an email address with an invalid format cannot be used to start registration.

### Test Data

| Run | Email                   |
| :-: | ----------------------- |
|  1  | `plainaddress`          |
|  2  | `user@`                 |
|  3  | `@domain.com`           |
|  4  | `user name@example.com` |

### Steps

1. Open `/login`.
2. In **New User Signup!**, enter a valid name and the invalid email.
3. Click **Signup**.

### Expected Result

- The form is not submitted; the URL stays `/login`.
- The email field is marked invalid (`:invalid` with a non-empty `validationMessage`).

---

<a id="tc-reg-007"></a>

## TC-REG-007 — Empty name or email on signup

Priority: P1  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Data-driven; fast; deterministic

### Objective

Verify that both fields of the signup step are required.

### Test Data

| Run | Name       | Email              |
| :-: | ---------- | ------------------ |
|  1  | _(empty)_  | valid unique email |
|  2  | valid name | _(empty)_          |

### Steps

1. Open `/login`.
2. Fill in the signup form with the test data and click **Signup**.

### Expected Result

- The form is not submitted; the URL stays `/login`.
- The empty field is marked invalid.

---

<a id="tc-reg-008"></a>

## TC-REG-008 — Registered email in different letter case

Priority: P1  
Automation: Yes — known defect ([DEF-01](README.md#defects))  
Tags: `@regression` `@registration` `@known-defect`  
Why automated: Documents DEF-01 and detects when it is fixed

### Objective

Verify that the duplicate-email check ignores letter case.

This is an **assumed requirement**, not one from the brief. The domain part of an address is
case-insensitive by standard; the local part may legally be case-sensitive (RFC 5321), but common
mail providers treat it as case-insensitive. A site that does not normalise emails can therefore
create two accounts for the same person, which is the risk this test covers.

### Preconditions

- A user with lowercase email _e_ is created through the API.

### Steps

1. Open `/login`.
2. Sign up with _e_ written in uppercase.

### Expected Result

- The message **Email Address already exist!** is shown and no account form is displayed.

### Actual Result

- The check is case-sensitive. The account form opens and a second account is created.

### Notes

Automated as a known-defect test: `test.fail()` is called after the precondition user exists and
the signup page has loaded, so a setup failure is reported as a real failure
([approach](README.md#how-known-defects-are-automated)). The cleanup fixture deletes both accounts.

---

<a id="tc-reg-009"></a>

## TC-REG-009 — Name and email carried to the account form

Priority: P2  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Cheap check that runs inside an existing flow

### Objective

Verify that the values from the signup step are carried over correctly, and that the email
cannot be changed after the duplicate check has run.

### Steps

1. Complete the signup step with a unique name and email.

### Expected Result

- **Name** is pre-filled with the entered name and can be edited.
- **Email** is pre-filled with the entered email and is disabled.

---

<a id="tc-reg-010"></a>

## TC-REG-010 — Unicode and special characters in personal data

Priority: P2  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Realistic local data; data-integrity risk; clear oracle via API

### Objective

Verify that names and addresses with non-English characters and punctuation are stored and
displayed without being corrupted.

### Test Data

| Field   | Value                          |
| ------- | ------------------------------ |
| Name    | `Đorđe Šćepanović`             |
| Address | `Kneza Miloša 7/II, "Stan" #4` |
| City    | `Novi Sad`                     |

### Steps

1. Register a new account with the test data.
2. Click **Continue**.

### Expected Result

- The header shows **Logged in as Đorđe Šćepanović**.
- `GET /api/getUserDetailByEmail` returns the values unchanged, with no broken characters and no
  truncation.

---

<a id="tc-reg-011"></a>

## TC-REG-011 — HTML in the name is displayed as text

Priority: P2  
Automation: Yes  
Tags: `@regression` `@registration`  
Why automated: Security regression risk; deterministic check

### Objective

Verify that HTML entered as a name is not executed. The name is shown in the header on every page,
which makes it a likely place for stored XSS.

### Test Data

Name: `<img src=x onerror=alert(1)>`

### Steps

1. Register a new account with the test data.
2. Click **Continue**.

### Expected Result

- No browser dialog is triggered.
- The header shows the literal text `Logged in as <img src=x onerror=alert(1)>`.
