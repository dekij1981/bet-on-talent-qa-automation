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

  userFactory: async ({ apiClient }, use, testInfo) => {
    const created: { email: string; password: string }[] = [];

    const factory: UserFactory = {
      build(overrides) {
        const user = buildUser(testInfo.workerIndex, overrides);
        created.push({ email: user.email, password: user.password });
        return user;
      },
      async createViaApi(overrides) {
        const user = factory.build(overrides);
        await apiClient.createAccount(user);
        return user;
      },
      track(email, password) {
        created.push({ email, password });
      },
    };

    await use(factory);

    // Teardown runs after the test, whether it passed or failed.
    // 404 is accepted: the account was never created, or the test deleted it itself.
    const failures: string[] = [];
    for (const { email, password } of created) {
      const body = await apiClient.deleteAccount(email, password);
      if (body.responseCode !== 200 && body.responseCode !== 404) {
        failures.push(`${email}: ${body.responseCode} ${body.message}`);
      }
    }
    expect(failures, 'Test accounts that could not be deleted').toEqual([]);
  },
});
