#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import process from "node:process";

const DEFAULT_PORTS = Object.freeze({
  home: 3100,
  "live-splash": 3101,
  weather: 3102,
});

export function selectWebApp(pathname) {
  if (pathname === "/weather" || pathname.startsWith("/weather/"))
    return "weather";
  if (pathname === "/live-splash" || pathname.startsWith("/live-splash/"))
    return "live-splash";
  return "home";
}

export function appCommands({
  development = false,
  ports = DEFAULT_PORTS,
} = {}) {
  return Object.fromEntries(
    Object.entries(ports).map(([app, port]) => [
      app,
      development
        ? {
            command: "pnpm",
            args: [
              "--filter",
              `@factory/${app}`,
              "exec",
              "next",
              "dev",
              "--hostname",
              "0.0.0.0",
              "--port",
              String(port),
            ],
            cwd: process.cwd(),
          }
        : {
            command: "node",
            args: [`/runtimes/${app}/apps/${app}/server.js`],
            cwd: `/runtimes/${app}`,
          },
    ]),
  );
}

export function rewriteInternalLocation(
  location,
  { forwardedHost, forwardedProto, targetPort },
) {
  if (!location) return location;
  try {
    const parsed = new URL(location);
    if (
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname) ||
      parsed.port === String(targetPort)
    ) {
      return `${forwardedProto}://${forwardedHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative redirects already preserve the public origin.
  }
  return location;
}

function proxyHttp(request, response, targetPort) {
  const forwardedHost =
    request.headers["x-forwarded-host"] || request.headers.host;
  const forwardedProto = request.headers["x-forwarded-proto"] || "http";
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: request.headers.host,
        "x-forwarded-host": forwardedHost,
        "x-forwarded-proto": forwardedProto,
      },
    },
    (upstreamResponse) => {
      const headers = { ...upstreamResponse.headers };
      if (headers.location) {
        headers.location = rewriteInternalLocation(headers.location, {
          forwardedHost,
          forwardedProto,
          targetPort,
        });
      }
      response.writeHead(upstreamResponse.statusCode ?? 502, headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", () => {
    if (!response.headersSent)
      response.writeHead(502, { "content-type": "text/plain" });
    response.end("Factory application is starting.");
  });
  request.pipe(upstream);
}

function proxyUpgrade(request, socket, head, targetPort) {
  const upstream = net.connect(targetPort, "127.0.0.1", () => {
    const forwardedHeaders = {
      ...request.headers,
      "x-forwarded-host":
        request.headers["x-forwarded-host"] || request.headers.host,
      "x-forwarded-proto": request.headers["x-forwarded-proto"] || "http",
    };
    const headers = Object.entries(forwardedHeaders)
      .map(([name, value]) => `${name}: ${value}`)
      .join("\r\n");
    upstream.write(
      `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`,
    );
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
}

export function createUnifiedWebRuntime({
  commands = appCommands({
    development: process.env.NODE_ENV !== "production",
  }),
  host = process.env.HOSTNAME || "0.0.0.0",
  port = Number(process.env.PORT || 8080),
  ports = DEFAULT_PORTS,
  spawnProcess = spawn,
} = {}) {
  const children = new Map();
  let stopping = false;
  let resolveStopped;
  const stopped = new Promise((resolve) => {
    resolveStopped = resolve;
  });

  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://factory.internal").pathname;
    proxyHttp(request, response, ports[selectWebApp(pathname)]);
  });
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, "http://factory.internal").pathname;
    proxyUpgrade(request, socket, head, ports[selectWebApp(pathname)]);
  });

  function stop(exitCode = 0) {
    if (stopping) return stopped;
    stopping = true;
    server.close();
    for (const child of children.values()) child.kill("SIGTERM");
    const deadline = setTimeout(() => {
      for (const child of children.values()) child.kill("SIGKILL");
    }, 10_000);
    deadline.unref();
    Promise.all(
      [...children.values()].map(
        (child) =>
          new Promise((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) resolve();
            else child.once("exit", resolve);
          }),
      ),
    ).then(() => {
      clearTimeout(deadline);
      resolveStopped(exitCode);
    });
    return stopped;
  }

  async function start() {
    for (const [app, specification] of Object.entries(commands)) {
      const child = spawnProcess(specification.command, specification.args, {
        cwd: specification.cwd,
        env: {
          ...process.env,
          HOSTNAME: "127.0.0.1",
          PORT: String(ports[app]),
        },
        stdio: "inherit",
      });
      children.set(app, child);
      child.once("error", (error) => {
        console.error(`[unified-web] ${app} failed to start:`, error);
        stop(1);
      });
      child.once("exit", (code, signal) => {
        if (!stopping) {
          console.error(
            `[unified-web] ${app} exited unexpectedly (${code ?? signal}).`,
          );
          stop(code || 1);
        }
      });
    }
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, resolve);
    });
    return server.address();
  }

  return { children, server, start, stop, stopped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runtime = createUnifiedWebRuntime();
  process.once("SIGINT", () => runtime.stop(0));
  process.once("SIGTERM", () => runtime.stop(0));
  await runtime.start();
  console.log(
    `[unified-web] listening on ${process.env.HOSTNAME || "0.0.0.0"}:${process.env.PORT || 8080}`,
  );
  process.exitCode = await runtime.stopped;
}
