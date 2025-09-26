import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow Turbopack to load the CommonJS bcryptjs package on the server.
    serverComponentsExternalPackages: ["bcryptjs"],
  },
};

export default nextConfig;