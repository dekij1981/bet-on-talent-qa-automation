import type { Page } from '@playwright/test';

const blockedHostSuffixes = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
];

export async function blockThirdPartyRequests(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    const shouldBlock = blockedHostSuffixes.some(
      (host) =>
        requestUrl.hostname === host ||
        requestUrl.hostname.endsWith(`.${host}`),
    );

    if (shouldBlock) {
      await route.abort();
      return;
    }

    await route.continue();
  });
}