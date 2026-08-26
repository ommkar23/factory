#!/usr/bin/env node

const MIN_PORT = 10_000;
const MAX_PORT = 59_999;
const PORT_COUNT = MAX_PORT - MIN_PORT + 1;

export function allocateServePorts({
  count = 2,
  occupiedPorts = [],
  worktreeHash,
}) {
  if (!/^[a-f0-9]{8,}$/i.test(worktreeHash)) {
    throw new Error(
      "worktreeHash must contain at least eight hexadecimal characters.",
    );
  }
  const occupied = new Set(occupiedPorts.map(Number));
  const selected = [];
  const start =
    MIN_PORT + (Number.parseInt(worktreeHash.slice(0, 8), 16) % PORT_COUNT);

  for (
    let offset = 0;
    offset < PORT_COUNT && selected.length < count;
    offset += 1
  ) {
    const candidate = MIN_PORT + ((start - MIN_PORT + offset) % PORT_COUNT);
    if (!occupied.has(candidate)) {
      selected.push(candidate);
      occupied.add(candidate);
    }
  }
  if (selected.length !== count)
    throw new Error("No free Tailscale Serve HTTPS ports are available.");
  return selected;
}

export function serveState(configuration = {}) {
  const occupiedPorts = Object.keys(configuration.TCP ?? {}).map(Number);
  const proxies = new Map();
  for (const [address, web] of Object.entries(configuration.Web ?? {})) {
    const port = Number(address.match(/:(\d+)$/)?.[1] ?? 443);
    const proxy = web?.Handlers?.["/"]?.Proxy;
    if (proxy) proxies.set(port, proxy);
  }
  return { occupiedPorts, proxies };
}

export function removableOwnedPorts({ configuration = {}, ownedRoutes = [] }) {
  const { proxies } = serveState(configuration);
  return ownedRoutes
    .filter(({ port, target }) => proxies.get(Number(port)) === target)
    .map(({ port }) => Number(port));
}

function parseConfiguration(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    throw new Error(`Invalid Tailscale Serve JSON: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "allocate") {
    const [worktreeHash, statusJson = "{}", reserved = ""] = args;
    const state = serveState(parseConfiguration(statusJson));
    const reservedPorts = reserved.split(",").filter(Boolean).map(Number);
    process.stdout.write(
      allocateServePorts({
        occupiedPorts: [...state.occupiedPorts, ...reservedPorts],
        worktreeHash,
      }).join(" "),
    );
  } else if (command === "proxy") {
    const [port, statusJson = "{}"] = args;
    process.stdout.write(
      serveState(parseConfiguration(statusJson)).proxies.get(Number(port)) ??
        "",
    );
  } else if (command === "hostname") {
    const [statusJson = "{}"] = args;
    const status = parseConfiguration(statusJson);
    process.stdout.write((status.Self?.DNSName ?? "").replace(/\.$/, ""));
  } else {
    console.error(
      "Usage: worktree-tailscale.mjs <allocate|proxy|hostname> ...",
    );
    process.exitCode = 2;
  }
}
