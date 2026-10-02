import type { NextConfig } from "next";

// NEXT_EXPORT=1 → static export (dipakai untuk deployment unified: UI + API dalam satu Space).
const nextConfig: NextConfig = {
  ...(process.env.NEXT_EXPORT === "1"
    ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
