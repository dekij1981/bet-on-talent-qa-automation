import { expect, test as base } from '@playwright/test';

import { ApiClient } from '../api/ApiClient';
import { buildUser, type UserData } from '../data/users';

export type UserFactory = {
  /** Builds unique user data and registers it for cleanup. Use when the test creates the account. */
  build(overrides?: Partial<UserData>): UserData;
  /** Builds a user and creates the account through the API. Use for preconditions. */
  createViaApi(overrides?: Partial<UserData>): Promise<UserData>;
  /** Registers an extra account for cleanup (e.g. a duplicate the application should not create). */
  track(email: string, password: string): void;
};

type ApiFixtures = {
  apiClient: ApiClient;
  userFactory: UserFactory;
};

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  userFactory: [
    async ({ apiClient }, use, testInfo) => {
      // Tracked before creation, so an account whose creation outcome is unknown (timeout,
      // crash mid-signup) is still deleted.
      const tracked: { email: string; password: string }[] = [];

      const factory: UserFactory = {
        build(overrides) {
          const user = buildUser(testInfo.workerIndex, overrides);
          tracked.push({ email: user.email, password: user.password });
          return user;
        },
        async createViaApi(overrides) {
          const user = factory.build(overrides);
          await apiClient.createAccount(user);
          return user;
        },
        track(email, password) {
          tracked.push({ email, password });
        },
      };

      await use(factory);

      // Teardown runs after the test body, passed or failed. Every account is attempted even if
      // an earlier deletion throws; failures are reported together at the end (no passwords).
      // 404 is accepted: the account was never created, or the test deleted it itself.
      const failures: string[] = [];
      for (const { email, password } of tracked) {
        try {
          const body = await apiClient.deleteAccount(email, password);
          if (body.responseCode !== 200 && body.responseCode !== 404) {
            failures.push(`${email}: responseCode ${body.responseCode} ${body.message ?? ''}`);
          }
        } catch (error) {
          failures.push(`${email}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      expect(failures, 'Test accounts that could not be deleted').toEqual([]);
    },
    // Own time budget, so cleanup is still attempted after the test itself timed out.
    { timeout: 30_000 },
  ],
});
