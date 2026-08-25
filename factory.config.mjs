export const factoryApps = Object.freeze([
  {
    directory: "apps/home",
    name: "home",
    packageName: "@factory/home",
  },
  {
    directory: "apps/live-splash",
    name: "live-splash",
    packageName: "@factory/live-splash",
  },
  {
    directory: "apps/weather",
    name: "weather",
    packageName: "@factory/weather",
  },
]);

export const clientBoundary = Object.freeze({
  allowedAppApiRoutes: ["api/auth/dev/bootstrap", "api/health"],
  allowedAppDependencies: ["next", "react", "react-dom"],
  allowedPackageDependencies: {
    "packages/auth/package.json": ["next"],
    "packages/contracts/package.json": [],
    "packages/ui/package.json": [
      "@base-ui/react",
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "tailwind-merge",
    ],
  },
  dynamicNetworkAdapters: {
    "apps/weather/lib/weather-api-client.js": {
      argumentName: "url",
    },
  },
});
