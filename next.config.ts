import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a slim Docker image.
  output: "standalone",
  // DuckDB ships a native addon; keep it out of the bundle so it loads via Node's require.
  serverExternalPackages: ["@duckdb/node-api"],
};

export default nextConfig;
