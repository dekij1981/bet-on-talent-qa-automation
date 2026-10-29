import { mergeTests } from '@playwright/test';

import { test as adBlockingTest } from './ad-blocking';
import { test as apiTest } from './api';
import { test as pagesTest } from './pages';

/** The only `test` that spec files import. */
export const test = mergeTests(adBlockingTest, apiTest, pagesTest);

export { expect } from '@playwright/test';
