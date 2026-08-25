import { fileURLToPath } from "node:url";

const factoryApiUrl = process.env.FACTORY_API_URL || "http://localhost:3004";

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath:
    process.env.FACTORY_SHARED_ORIGIN === "true" ? "/weather" : undefined,
  env: {
    FACTORY_SHARED_ORIGIN: process.env.FACTORY_SHARED_ORIGIN,
  },
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: `${factoryApiUrl}/auth/:path*`,
        basePath: false,
      },
      {
        source: "/app/:path*",
        destination: `${factoryApiUrl}/app/:path*`,
        basePath: false,
      },
    ];
  },
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
};

export default nextConfig;
