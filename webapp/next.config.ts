import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a monorepo whose root package.json belongs to the Remotion video pipeline.
  // Without pinning the root, Next picks the outer lockfile and traces the wrong file tree.
  turbopack: { root: __dirname },
};

export default nextConfig;
