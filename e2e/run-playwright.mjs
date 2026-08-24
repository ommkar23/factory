import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const argumentsFromPnpm = process.argv
  .slice(2)
  .filter((argument) => argument !== "--");
const child = spawn(
  process.execPath,
  [playwrightCli, "test", ...argumentsFromPnpm],
  {
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
