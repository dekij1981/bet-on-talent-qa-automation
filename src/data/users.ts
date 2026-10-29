import { randomBytes } from 'node:crypto';

import { env } from '../config/env';

export type Title = 'Mr' | 'Mrs';

export type UserData = {
  name: string;
  email: string;
  password: string;
  title: Title;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  newsletter: boolean;
  specialOffers: boolean;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
};

/** Fields the account form marks as `required`; drives TC-REG-004 and TC-REG-005. */
export const requiredAccountFields = [
  'password',
  'firstName',
  'lastName',
  'address',
  'state',
  'city',
  'zipcode',
  'mobileNumber',
] as const satisfies readonly (keyof UserData)[];

export type RequiredAccountField = (typeof requiredAccountFields)[number];

// One id per test run, so leftover accounts can be traced back to the run that created them.
const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString(36);

export function uniqueId(): string {
  return randomBytes(4).toString('hex');
}

/** qa.<run-id>.<worker-index>.<random>@<domain>: unique across runs, workers and tests. */
export function uniqueEmail(workerIndex: number): string {
  return `qa.${runId}.${workerIndex}.${uniqueId()}@${env.emailDomain}`;
}

export function buildUser(workerIndex: number, overrides: Partial<UserData> = {}): UserData {
  const id = uniqueId();

  return {
    name: `QA User ${id}`,
    email: uniqueEmail(workerIndex),
    password: env.userPassword,
    title: 'Mr',
    birthDay: '5',
    birthMonth: '3',
    birthYear: '1990',
    newsletter: true,
    specialOffers: true,
    firstName: 'Qa',
    lastName: `Tester-${id}`,
    company: 'Test Company',
    address: `Test Street ${id}`,
    address2: 'Apartment 1',
    // Not the default (India), so the test proves the selection is stored.
    country: 'Canada',
    state: 'Ontario',
    city: 'Toronto',
    zipcode: 'M5V2T6',
    mobileNumber: '5551234567',
    ...overrides,
  };
}
