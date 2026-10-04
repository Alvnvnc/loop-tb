import type { NextConfig } from "next";

// NEXT_EXPORT=1  → static export (deployment statis / unified Space).
// NEXT_BASE_PATH → prefix path (mis. "/loop-tb" untuk GitHub project pages).
const base = process.env.NEXT_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(base ? { basePath: base, assetPrefix: base } : {}),
  ...(process.env.NEXT_EXPORT === "1"
    ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;