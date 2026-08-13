/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "../..",
  },
  // TypeScript 7 is validated by the workspace typecheck task. Next 16.1.1's
  // build-time TypeScript dependency detector cannot recognize it yet.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
