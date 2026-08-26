import { existsSync } from "node:fs";

const LOCAL_APP_NAMES = ["home", "live-splash", "weather"];
const LOCAL_BOOTSTRAP_PATH = "/api/auth/dev/bootstrap";

function skipped(reason) {
  return { ready: false, reason: `E2E skipped: ${reason}` };
}

function parseOrigin(value, label, protocols) {
  if (!value) {
    return { error: `${label} is not set` };
  }

  try {
    const url = new URL(value);
    if (
      !protocols.includes(url.protocol) ||
      !url.hostname ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return {
        error: `${label} must be an origin using ${protocols.join(" or ")}`,
      };
    }
    return { value: url.origin };
  } catch {
    return { error: `${label} must be a valid origin` };
  }
}

function parseSameOriginPath(value, label) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return { error: `${label} must be a root-relative path` };
  }
  return { value };
}

export function browserApiContractViolations({
  origin,
  protectedApiPath,
  requests,
}) {
  const browserApiRequests = requests.filter(({ resourceType }) =>
    ["fetch", "xhr"].includes(resourceType),
  );
  const violations = browserApiRequests.flatMap(({ resourceType, url }) => {
    const requestUrl = new URL(url);
    if (requestUrl.origin !== origin) {
      return [`cross-origin browser ${resourceType} request: ${url}`];
    }

    const prohibitedPath =
      requestUrl.pathname.startsWith("/api/") &&
      requestUrl.pathname !== LOCAL_BOOTSTRAP_PATH;
    return prohibitedPath
      ? [`disallowed same-origin browser ${resourceType} request: ${url}`]
      : [];
  });
  const protectedApiUrl = new URL(protectedApiPath, origin).toString();

  if (!browserApiRequests.some(({ url }) => url === protectedApiUrl)) {
    violations.push(
      `protected Factory request was not observed: ${protectedApiUrl}`,
    );
  }

  return violations;
}

export function sharedOriginConfiguration(environment = process.env) {
  const origin = parseOrigin(
    environment.FACTORY_E2E_SHARED_ORIGIN_URL,
    "FACTORY_E2E_SHARED_ORIGIN_URL",
    ["https:"],
  );
  const protectedPath = parseSameOriginPath(
    environment.FACTORY_E2E_SHARED_ORIGIN_PROTECTED_PATH,
    "FACTORY_E2E_SHARED_ORIGIN_PROTECTED_PATH",
  );
  const storageState = environment.FACTORY_E2E_SHARED_ORIGIN_STORAGE_STATE;
  const errors = [origin.error, protectedPath.error];

  if (!storageState) {
    errors.push(
      "FACTORY_E2E_SHARED_ORIGIN_STORAGE_STATE is not set (it must contain only the test identity-provider session, not Factory cookies)",
    );
  }

  if (errors.some(Boolean)) {
    return skipped(errors.filter(Boolean).join("; "));
  }

  return {
    ready: true,
    origin: origin.value,
    protectedPath: protectedPath.value,
    storageState,
  };
}

export function sharedOriginRuntimeConfiguration(environment = process.env) {
  const configuration = sharedOriginConfiguration(environment);
  if (!configuration.ready) {
    return configuration;
  }
  if (!existsSync(configuration.storageState)) {
    return skipped(
      `FACTORY_E2E_SHARED_ORIGIN_STORAGE_STATE does not exist: ${configuration.storageState}`,
    );
  }
  return configuration;
}

function parseLocalApp(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return {
      error: "each FACTORY_E2E_LOCAL_PROXY_APPS entry must be an object",
    };
  }

  const origin = parseOrigin(item.origin, `${item.name || "unnamed"}.origin`, [
    "http:",
    "https:",
  ]);
  const bootstrapPath = parseSameOriginPath(
    item.bootstrapPath,
    `${item.name || "unnamed"}.bootstrapPath`,
  );
  if (bootstrapPath.value && bootstrapPath.value !== LOCAL_BOOTSTRAP_PATH) {
    bootstrapPath.error = `${item.name || "unnamed"}.bootstrapPath must be ${LOCAL_BOOTSTRAP_PATH}`;
  }
  const protectedApiPath = parseSameOriginPath(
    item.protectedApiPath,
    `${item.name || "unnamed"}.protectedApiPath`,
  );
  if (
    protectedApiPath.value &&
    !new URL(
      protectedApiPath.value,
      "https://factory.invalid",
    ).pathname.startsWith("/app/")
  ) {
    protectedApiPath.error = `${item.name || "unnamed"}.protectedApiPath must be a Factory /app/* route`;
  }
  const publicPath = parseSameOriginPath(
    item.publicPath || "/api/health",
    `${item.name || "unnamed"}.publicPath`,
  );
  const protectedPagePath = parseSameOriginPath(
    item.protectedPagePath || "/",
    `${item.name || "unnamed"}.protectedPagePath`,
  );
  const loginPath = parseSameOriginPath(
    item.loginPath || "/login",
    `${item.name || "unnamed"}.loginPath`,
  );
  const errors = [
    origin.error,
    bootstrapPath.error,
    protectedApiPath.error,
    publicPath.error,
    protectedPagePath.error,
    loginPath.error,
  ];

  if (typeof item.name !== "string" || !item.name) {
    errors.push("each FACTORY_E2E_LOCAL_PROXY_APPS entry needs a name");
  }
  if (errors.some(Boolean)) {
    return { error: errors.filter(Boolean).join("; ") };
  }

  return {
    value: {
      name: item.name,
      origin: origin.value,
      bootstrapPath: bootstrapPath.value,
      protectedApiPath: protectedApiPath.value,
      publicPath: publicPath.value,
      protectedPagePath: protectedPagePath.value,
      loginPath: loginPath.value,
    },
  };
}

export function parseLocalProxyApps(value) {
  if (!value) {
    return skipped("FACTORY_E2E_LOCAL_PROXY_APPS is not set");
  }

  let entries;
  try {
    entries = JSON.parse(value);
  } catch {
    return skipped("FACTORY_E2E_LOCAL_PROXY_APPS must be valid JSON");
  }
  if (!Array.isArray(entries)) {
    return skipped("FACTORY_E2E_LOCAL_PROXY_APPS must be a JSON array");
  }

  const parsed = entries.map(parseLocalApp);
  const errors = parsed.flatMap((entry) => (entry.error ? [entry.error] : []));
  const names = parsed.flatMap((entry) =>
    entry.value ? [entry.value.name] : [],
  );
  const missingNames = LOCAL_APP_NAMES.filter((name) => !names.includes(name));
  const duplicateNames = names.filter(
    (name, index) => names.indexOf(name) !== index,
  );
  const unexpectedNames = names.filter(
    (name) => !LOCAL_APP_NAMES.includes(name),
  );
  const origins = parsed.flatMap((entry) =>
    entry.value ? [entry.value.origin] : [],
  );
  const multipleOrigins = new Set(origins).size > 1;

  if (
    errors.length ||
    missingNames.length ||
    duplicateNames.length ||
    unexpectedNames.length ||
    multipleOrigins
  ) {
    const details = [
      ...errors,
      ...(missingNames.length
        ? [`missing local app entries: ${missingNames.join(", ")}`]
        : []),
      ...(duplicateNames.length
        ? [
            `duplicate local app entries: ${[...new Set(duplicateNames)].join(", ")}`,
          ]
        : []),
      ...(unexpectedNames.length
        ? [
            `unexpected local app entries: ${[...new Set(unexpectedNames)].join(", ")}`,
          ]
        : []),
      ...(multipleOrigins
        ? ["all local applications must use one unified Factory origin"]
        : []),
    ];
    return skipped(details.join("; "));
  }

  return { ready: true, apps: parsed.map((entry) => entry.value) };
}

export function localProxyConfiguration(environment = process.env) {
  return parseLocalProxyApps(environment.FACTORY_E2E_LOCAL_PROXY_APPS);
}
