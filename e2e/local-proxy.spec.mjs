import { expect, test } from "@playwright/test";
import { localProxyConfiguration } from "./support/live-config.mjs";

const configuration = localProxyConfiguration();
test.skip(!configuration.ready, configuration.reason);

function factoryCookies(cookies) {
  return cookies.filter((cookie) =>
    ["Factory-Access-Token", "Factory-Refresh-Token"].includes(cookie.name),
  );
}

test("uses a same-origin server-only development bootstrap on each local app", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  for (const app of configuration.apps) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const publicResponse = await page.goto(
        new URL(app.publicPath, app.origin).toString(),
      );
      expect(publicResponse?.status()).toBe(200);

      let bootstrapRequest;
      let bootstrapResponse;
      page.on("request", (request) => {
        if (
          request.url() === new URL(app.bootstrapPath, app.origin).toString()
        ) {
          bootstrapRequest = request;
        }
      });
      page.on("response", (response) => {
        if (
          response.url() === new URL(app.bootstrapPath, app.origin).toString()
        ) {
          bootstrapResponse = response;
        }
      });

      await page.goto(new URL(app.protectedPagePath, app.origin).toString());
      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(app.protectedPagePath);
      expect(bootstrapRequest).toBeDefined();
      expect(bootstrapResponse?.status()).toBe(204);
      expect(new URL(bootstrapRequest.url()).origin).toBe(app.origin);
      expect(bootstrapRequest.headers()["x-dev-auth-secret"]).toBeUndefined();

      const cookies = factoryCookies(await context.cookies(app.origin));
      expect(cookies).toHaveLength(2);
      for (const cookie of cookies) {
        expect(cookie.httpOnly).toBe(true);
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
      }, app.protectedApiPath);
      expect(protectedStatus).toBe(200);

      const logoutStatus = await page.evaluate(async () => {
        const response = await fetch("/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        return response.status;
      });
      expect(logoutStatus).toBe(204);
      expect(factoryCookies(await context.cookies(app.origin))).toEqual([]);
    } finally {
      await context.close();
    }
  }
});
