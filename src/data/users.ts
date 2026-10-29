import { randomBytes } from 'node:crypto';

import { env } from '../config/env';
import { testData } from './test-data';

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

/** Unique identity (name, email) per call; profile values from test data (see test-data.ts). */
export function buildUser(workerIndex: number, overrides: Partial<UserData> = {}): UserData {
  const profile = testData.user;

  return {
    ...profile,
    // Validated as Mr or Mrs when the test data is loaded.
    title: profile.title as Title,
    name: `QA User ${uniqueId()}`,
    email: uniqueEmail(workerIndex),
    password: env.userPassword,
    ...overrides,
  };
}
