import { test as base } from '@playwright/test';

/**
 * Ad, consent and analytics hosts seen on automationexercise.com (measured on /, /products,
 * /login and /product_details/1). Subdomains are matched too.
 *
 * Why block instead of closing pop-ups: Google vignette ads take over the page and swallow
 * clicks, banners shift the layout mid-click, and auto-ads inject text into product names
 * (OBS-05). None of this is the application under test, and none of it is deterministic.
 */
export const blockedHosts = [
  'googlesyndication.com', // ad scripts (pagead2.*)
  'doubleclick.net', // ad frames
  'adtrafficquality.google', // ad fraud checks (ep1.*, ep2.*)
  'fundingchoicesmessages.google.com', // consent dialog
  'cloudflareinsights.com', // analytics beacon
] as const;

export function isBlockedHost(hostname: string): boolean {
  return blockedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export const test = base.extend<{ blockAds: void }>({
  // Auto fixture: applies to every test without being requested. Routing on the context
  // (not the page) also covers pop-ups and new tabs an ad could open.
  blockAds: [
    async ({ context }, use) => {
      await context.route(
        (url) => isBlockedHost(url.hostname),
        (route) => route.abort('blockedbyclient'),
      );
      await use();
    },
    { auto: true },
  ],
});
