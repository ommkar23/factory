import { existsSync } from "node:fs";

const LOCAL_APP_NAMES = ["home", "live-splash", "weather"];

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
  const protectedApiPath = parseSameOriginPath(
    item.protectedApiPath,
    `${item.name || "unnamed"}.protectedApiPath`,
  );
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

  if (
    errors.length ||
    missingNames.length ||
    duplicateNames.length ||
    unexpectedNames.length
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
    ];
    return skipped(details.join("; "));
  }

  return { ready: true, apps: parsed.map((entry) => entry.value) };
}

export function localProxyConfiguration(environment = process.env) {
  return parseLocalProxyApps(environment.FACTORY_E2E_LOCAL_PROXY_APPS);
}
