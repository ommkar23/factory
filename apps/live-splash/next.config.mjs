import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath:
    process.env.FACTORY_SHARED_ORIGIN === "true" ? "/live-splash" : undefined,
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
};

export default nextConfig;
