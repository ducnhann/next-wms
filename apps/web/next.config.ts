import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: ["prettier"],
  images: {
    remotePatterns: [new URL(`${process.env.NEXT_PUBLIC_CONVEX_URL}/**`), new URL("https://hushed-gopher-571.convex.cloud/**")], 
  },
};

export default nextConfig;
