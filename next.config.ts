import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Turbopack to load the CommonJS bcryptjs package on the server.
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;