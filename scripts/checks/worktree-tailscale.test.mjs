import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  allocateServePorts,
  removableOwnedPorts,
  serveState,
} from "../worktree-tailscale.mjs";

const root = path.resolve(import.meta.dirname, "../..");

function configuration(routes) {
  return {
    TCP: Object.fromEntries(routes.map(({ port }) => [port, { HTTPS: true }])),
    Web: Object.fromEntries(
      routes.map(({ port, target }) => [
        `factory-dev.example.ts.net:${port}`,
        { Handlers: { "/": { Proxy: target } } },
      ]),
    ),
  };
}

test("worktrees receive distinct stable ports without replacing occupied routes", () => {
  const first = allocateServePorts({ worktreeHash: "12345678aa" });
  assert.deepEqual(allocateServePorts({ worktreeHash: "12345678aa" }), first);
  const occupied = configuration([
    { port: first[0], target: "http://127.0.0.1:3000" },
    { port: first[1], target: "http://127.0.0.1:3001" },
    { port: 443, target: "http://127.0.0.1:4000" },
  ]);
  const second = allocateServePorts({
    occupiedPorts: serveState(occupied).occupiedPorts,
    worktreeHash: "12345678aa",
  });
  assert.equal(second.includes(first[0]), false);
  assert.equal(second.includes(443), false);
  assert.equal(new Set([...first, ...second]).size, 4);
});

test("reserved ledger ports participate in collision avoidance", () => {
  const baseline = allocateServePorts({ worktreeHash: "abcdef12aa" });
  const selected = allocateServePorts({
    occupiedPorts: baseline,
    worktreeHash: "abcdef12aa",
  });
  assert.equal(
    selected.some((port) => baseline.includes(port)),
    false,
  );
});

test("cleanup removes only exact owned proxies and is idempotent", () => {
  const ownedRoutes = [
    { port: 12000, target: "http://127.0.0.1:32000" },
    { port: 12001, target: "http://127.0.0.1:32001" },
  ];
  const state = configuration([
    ownedRoutes[0],
    { port: 12001, target: "http://127.0.0.1:foreign" },
    { port: 13000, target: "http://127.0.0.1:other-worktree" },
  ]);
  assert.deepEqual(
    removableOwnedPorts({ configuration: state, ownedRoutes }),
    [12000],
  );
  assert.deepEqual(removableOwnedPorts({ configuration: {}, ownedRoutes }), []);
});

test("the lifecycle records ownership before mutation and checks targets before removal", async () => {
  const lifecycle = await readFile(
    path.join(root, "scripts/worktree-dev"),
    "utf8",
  );
  assert.match(lifecycle, /write_ledger\n  register_tailscale_target/);
  assert.match(
    lifecycle,
    /if \[\[ "\$current" == "\$expected" \|\| \( -n "\$previous"/,
  );
  assert.match(lifecycle, /tailscale serve --https="\$port" off/);
  assert.match(lifecycle, /preserving \$current/);
  assert.match(lifecycle, /tailscale-serve\.lock/);
  assert.match(lifecycle, /tailscale_factory_previous_target/);
});
