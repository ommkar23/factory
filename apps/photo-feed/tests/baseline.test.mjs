import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("photo-feed home page renders the Hello World baseline", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /<h1>Hello World<\/h1>/);
  assert.match(page, /Photo Feed local development is ready\./);
});
