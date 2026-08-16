import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,

  allowedDevOrigins: ["127.0.0.1"],

  turbopack: {
    root: path.resolve(__dirname),
  },

  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdfjs-dist",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;