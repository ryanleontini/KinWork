import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (another lockfile exists in $HOME).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
