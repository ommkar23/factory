import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import http from "node:http";
import test from "node:test";
import {
  createUnifiedWebRuntime,
  rewriteInternalLocation,
  selectWebApp,
} from "../unified-web.mjs";

class FakeChild extends EventEmitter {
  exitCode = null;
  signalCode = null;
  signals = [];
  kill(signal) {
    this.signals.push(signal);
    if (this.exitCode === null && this.signalCode === null) {
      this.signalCode = signal;
      queueMicrotask(() => this.emit("exit", null, signal));
    }
    return true;
  }
}

async function backend(name) {
  const server = http.createServer((request, response) => {
    response.setHeader("x-factory-app", name);
    response.end(`${name}:${request.url}`);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function request(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () =>
          resolve({
            body,
            headers: response.headers,
            status: response.statusCode,
          }),
        );
      })
      .on("error", reject);
  });
}

const commands = Object.fromEntries(
  ["home", "weather", "live-splash"].map((app) => [
    app,
    {
      command: "unused",
      args: [],
      cwd: ".",
    },
  ]),
);

test("route selection requires exact application path segments", () => {
  assert.equal(selectWebApp("/"), "home");
  assert.equal(selectWebApp("/weather"), "weather");
  assert.equal(selectWebApp("/weather/detail"), "weather");
  assert.equal(selectWebApp("/weathering"), "home");
  assert.equal(selectWebApp("/live-splash"), "live-splash");
  assert.equal(selectWebApp("/live-splash/_next/static/app.js"), "live-splash");
  assert.equal(selectWebApp("/live-splashes"), "home");
});

test("internal absolute redirects are rewritten to the public Factory origin", () => {
  const options = {
    forwardedHost: "factory.example.test",
    forwardedProto: "https",
    targetPort: 3100,
  };
  assert.equal(
    rewriteInternalLocation("http://localhost:3100/login?next=%2F", options),
    "https://factory.example.test/login?next=%2F",
  );
  assert.equal(
    rewriteInternalLocation("/weather/login", options),
    "/weather/login",
  );
  assert.equal(
    rewriteInternalLocation("https://accounts.google.com/oauth", options),
    "https://accounts.google.com/oauth",
  );
});

test("one public port serves app pages, assets, and app-local API routes", async (t) => {
  const servers = Object.fromEntries(
    await Promise.all(
      ["home", "weather", "live-splash"].map(async (app) => [
        app,
        await backend(app),
      ]),
    ),
  );
  const ports = Object.fromEntries(
    Object.entries(servers).map(([app, server]) => [
      app,
      server.address().port,
    ]),
  );
  const children = [];
  const runtime = createUnifiedWebRuntime({
    commands,
    host: "127.0.0.1",
    port: 0,
    ports,
    spawnProcess: () => {
      const child = new FakeChild();
      children.push(child);
      return child;
    },
  });
  const address = await runtime.start();
  t.after(async () => {
    await runtime.stop();
    await Promise.all(
      Object.values(servers).map(
        (server) => new Promise((resolve) => server.close(resolve)),
      ),
    );
  });

  for (const [path, app] of [
    ["/", "home"],
    ["/_next/static/home.js", "home"],
    ["/api/health", "home"],
    ["/auth/session", "home"],
    ["/app/weather", "home"],
    ["/weather", "weather"],
    ["/weather/detail?unit=c", "weather"],
    ["/weather/_next/static/weather.js", "weather"],
    ["/weather/api/health", "weather"],
    ["/weather/api/auth/dev/bootstrap", "weather"],
    ["/live-splash", "live-splash"],
    ["/live-splash/_next/static/splash.js", "live-splash"],
    ["/live-splash/api/auth/dev/bootstrap", "live-splash"],
  ]) {
    const response = await request(address.port, path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers["x-factory-app"], app, path);
    assert.equal(response.body, `${app}:${path}`, path);
  }
});

test("an unexpected child exit terminates every child", async () => {
  const children = [];
  const runtime = createUnifiedWebRuntime({
    commands,
    host: "127.0.0.1",
    port: 0,
    spawnProcess: () => {
      const child = new FakeChild();
      children.push(child);
      return child;
    },
  });
  await runtime.start();
  children[1].exitCode = 7;
  children[1].emit("exit", 7, null);
  assert.equal(await runtime.stopped, 7);
  assert.deepEqual(
    children.map((child) => child.signals),
    [["SIGTERM"], ["SIGTERM"], ["SIGTERM"]],
  );
});

test("graceful shutdown forwards SIGTERM and closes the listener", async () => {
  const children = [];
  const runtime = createUnifiedWebRuntime({
    commands,
    host: "127.0.0.1",
    port: 0,
    spawnProcess: () => {
      const child = new FakeChild();
      children.push(child);
      return child;
    },
  });
  const address = await runtime.start();
  assert.equal(await runtime.stop(), 0);
  assert.deepEqual(
    children.map((child) => child.signals),
    [["SIGTERM"], ["SIGTERM"], ["SIGTERM"]],
  );
  await assert.rejects(request(address.port, "/"));
});
