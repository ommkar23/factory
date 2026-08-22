import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as publicApi from "../src/index";
describe("public API", () => {
  it("uses package-internal source resolver aliases from the public barrel", () => {
    const barrel = readFileSync(resolve(process.cwd(), "src/index.js"), "utf8");
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );
    expect(barrel).not.toContain('from "./');
    expect(barrel).toContain('from "#components/alert"');
    expect(barrel).toContain('from "#components/badge"');
    expect(barrel).toContain('from "#components/button"');
    expect(barrel).toContain('from "#components/card"');
    expect(barrel).toContain('from "#components/input"');
    expect(barrel).toContain('from "#components/label"');
    expect(barrel).toContain('from "#components/skeleton"');
    expect(barrel).toContain('from "#components/spinner"');
    expect(barrel).toContain('from "#status-message"');
    expect(manifest.imports["#status-message"]).toBe(
      "./src/status-message.jsx",
    );
  });
  it("exports the approved shared primitive inventory from the package root", () => {
    expect(publicApi).toMatchObject({
      Alert: expect.any(Function),
      Badge: expect.any(Function),
      Button: expect.any(Function),
      Card: expect.any(Function),
      Input: expect.any(Function),
      Label: expect.any(Function),
      Skeleton: expect.any(Function),
      Spinner: expect.any(Function),
      StatusMessage: expect.any(Function),
    });
  });
});
