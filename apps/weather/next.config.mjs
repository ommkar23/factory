import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath:
    process.env.FACTORY_SHARED_ORIGIN === "true" ? "/weather" : undefined,
  env: {
    FACTORY_SHARED_ORIGIN: process.env.FACTORY_SHARED_ORIGIN,
  },
  output: "standalone",
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
};

export default nextConfig;
