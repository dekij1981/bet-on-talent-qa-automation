import { readFileSync } from 'node:fs';
import path from 'node:path';

import { readInt, readString } from '../config/env';

/**
 * Environment-specific test data: user profile values and catalogue-dependent search inputs.
 *
 * Precedence (highest first): PRODUCT_* environment variables → the JSON file named by
 * TEST_DATA_FILE → the defaults below. Account identities (name, email) are always generated at
 * runtime; the password and email domain come from env (see src/config/env.ts).
 */

const defaults = {
  user: {
    title: 'Mr',
    birthDay: '5',
    birthMonth: '3',
    birthYear: '1990',
    newsletter: true,
    specialOffers: true,
    firstName: 'Qa',
    lastName: 'Tester',
    company: 'Test Company',
    address: 'Test Street 1',
    address2: 'Apartment 1',
    // Not the form default (India), so TC-REG-001 proves the selection is stored.
    country: 'Canada',
    state: 'Ontario',
    city: 'Toronto',
    zipcode: 'M5V2T6',
    mobileNumber: '5551234567',
  },
  product: {
    searchTerm: 'Blue Top',
    name: 'Blue Top',
    price: 'Rs. 500',
    availability: 'In Stock',
    quantity: 3,
  },
  search: {
    // Each must return more than one product (TC-SEARCH-003).
    partialTerms: ['top', 'jeans'],
    // Each must appear in exactly one product name or category (TC-SEARCH-009).
    ampersandTerms: ['Fit & Flare', 'Blue & Pink'],
    // Term whose results are opened (TC-SEARCH-006), and how many of them.
    detailPagesTerm: 'top',
    detailPagesSampleSize: 5,
  },
};

export type TestData = typeof defaults;

const FORM_DEFAULT_COUNTRY = 'India';

function fail(file: string, message: string): never {
  throw new Error(`Invalid test data in ${file}: ${message}`);
}

/** Checks one section against the defaults: known keys, same types, nothing empty. */
function mergeSection<T extends Record<string, unknown>>(
  file: string,
  section: string,
  base: T,
  override: unknown,
): T {
  if (override === undefined) return base;
  if (typeof override !== 'object' || override === null || Array.isArray(override)) {
    fail(file, `"${section}" must be an object`);
  }

  for (const [key, value] of Object.entries(override)) {
    if (!(key in base)) {
      fail(file, `unknown key "${section}.${key}". Allowed: ${Object.keys(base).join(', ')}`);
    }
    const expected = base[key];
    const where = `"${section}.${key}"`;
    if (Array.isArray(expected)) {
      if (!Array.isArray(value) || value.length === 0)
        fail(file, `${where} must be a non-empty list`);
      if (value.some((item) => typeof item !== 'string' || item.trim() === '')) {
        fail(file, `${where} must contain only non-empty strings`);
      }
    } else if (typeof value !== typeof expected) {
      fail(file, `${where} must be a ${typeof expected}`);
    } else if (typeof value === 'string' && value.trim() === '') {
      fail(file, `${where} must not be empty`);
    }
  }
  return { ...base, ...(override as Partial<T>) };
}

function loadFile(): TestData {
  const file = process.env.TEST_DATA_FILE?.trim();
  if (!file) return defaults;

  const fullPath = path.resolve(process.cwd(), file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `TEST_DATA_FILE "${file}" could not be read as JSON (${fullPath}): ${(error as Error).message}`,
      { cause: error },
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(file, 'the top level must be an object');
  }

  const { user, product, search, ...rest } = parsed as Record<string, unknown>;
  const unknown = Object.keys(rest);
  if (unknown.length > 0) {
    fail(file, `unknown section(s) ${unknown.join(', ')}. Allowed: user, product, search`);
  }

  const data: TestData = {
    user: mergeSection(file, 'user', defaults.user, user),
    product: mergeSection(file, 'product', defaults.product, product),
    search: mergeSection(file, 'search', defaults.search, search),
  };

  if (data.user.title !== 'Mr' && data.user.title !== 'Mrs')
    fail(file, '"user.title" must be Mr or Mrs');
  if (data.user.country === FORM_DEFAULT_COUNTRY) {
    fail(
      file,
      `"user.country" must not be the form default (${FORM_DEFAULT_COUNTRY}); TC-REG-001 must prove the selection is stored`,
    );
  }
  if (!Number.isInteger(data.product.quantity) || data.product.quantity < 1) {
    fail(file, '"product.quantity" must be an integer >= 1');
  }
  if (
    !Number.isInteger(data.search.detailPagesSampleSize) ||
    data.search.detailPagesSampleSize < 1
  ) {
    fail(file, '"search.detailPagesSampleSize" must be an integer >= 1');
  }
  return data;
}

const fromFile = loadFile();

export const testData: TestData = {
  ...fromFile,
  product: {
    searchTerm: readString('PRODUCT_SEARCH_TERM', fromFile.product.searchTerm),
    name: readString('PRODUCT_NAME', fromFile.product.name),
    price: readString('PRODUCT_PRICE', fromFile.product.price),
    availability: readString('PRODUCT_AVAILABILITY', fromFile.product.availability),
    quantity: readInt('PRODUCT_QUANTITY', fromFile.product.quantity, 1),
  },
};
