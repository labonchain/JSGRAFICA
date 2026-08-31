import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'google-auth-library'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
