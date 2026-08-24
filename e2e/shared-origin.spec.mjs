import { expect, test } from "@playwright/test";
import { sharedOriginRuntimeConfiguration } from "./support/live-config.mjs";

const configuration = sharedOriginRuntimeConfiguration();
test.skip(!configuration.ready, configuration.reason);

const approvedDestinations = ["/", "/live-splash", "/weather"];

function factoryCookies(cookies) {
  return cookies.filter((cookie) =>
    ["Factory-Access-Token", "Factory-Refresh-Token"].includes(cookie.name),
  );
}

test("completes the production-shaped Factory session lifecycle for every approved destination", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    storageState: configuration.storageState,
  });
  const page = await context.newPage();

  try {
    expect(factoryCookies(await context.cookies(configuration.origin))).toEqual(
      [],
    );

    for (const destination of approvedDestinations) {
      const callbackResponses = [];
      const callbackListener = (response) => {
        const url = new URL(response.url());
        if (
          url.origin === configuration.origin &&
          url.pathname === "/auth/callback"
        ) {
          callbackResponses.push(response);
        }
      };
      page.on("response", callbackListener);

      await page.goto(
        new URL(
          `/auth/login?next=${encodeURIComponent(destination)}`,
          configuration.origin,
        ).toString(),
        { waitUntil: "domcontentloaded" },
      );
      await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
      page.off("response", callbackListener);

      expect(
        callbackResponses.some((response) => response.status() === 303),
      ).toBe(true);
      const cookies = factoryCookies(
        await context.cookies(configuration.origin),
      );
      expect(cookies).toHaveLength(2);
      for (const cookie of cookies) {
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.secure).toBe(true);
        expect(cookie.sameSite).toBe("Lax");
      }

      const sessionStatus = await page.evaluate(async () => {
        const response = await fetch("/auth/session", {
          credentials: "same-origin",
        });
        return response.status;
      });
      expect(sessionStatus).toBe(200);

      const protectedStatus = await page.evaluate(async (path) => {
        const response = await fetch(path, { credentials: "same-origin" });
        return response.status;
      }, configuration.protectedPath);
      expect(protectedStatus).toBe(200);

      const logoutStatus = await page.evaluate(async () => {
        const response = await fetch("/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        return response.status;
      });
      expect(logoutStatus).toBe(204);
      expect(
        factoryCookies(await context.cookies(configuration.origin)),
      ).toEqual([]);
    }
  } finally {
    await context.close();
  }
});
