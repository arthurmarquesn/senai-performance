import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
