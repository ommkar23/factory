import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Live Splash home page uses public shared primitives for a truthful baseline", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /from "@factory\/ui";/);
  for (const primitive of [
    "Alert",
    "AlertDescription",
    "AlertTitle",
    "Badge",
    "Card",
    "CardContent",
    "CardHeader",
  ]) {
    assert.match(page, new RegExp(`\\b${primitive}\\b`));
  }
  assert.match(page, /<main className="min-h-screen/);
  assert.match(page, /<h1[^>]*>\s*Live Splash\s*<\/h1>/);
  assert.match(page, /<Badge variant="outline">Development baseline<\/Badge>/);
  assert.match(
    page,
    /<h2[\s\S]*?id="live-splash-current-state"[\s\S]*?>\s*Current state\s*<\/h2>/,
  );
  assert.match(
    page,
    /<Alert\s+aria-labelledby="live-splash-current-state"\s+role="region">/,
  );
  assert.doesNotMatch(page, /role="(?:alert|status)"/);
  assert.match(page, /No Live Splash feed is connected yet\./);
  assert.doesNotMatch(page, /packages\/ui\/src/);
});
