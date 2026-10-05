import type { NextConfig } from "next";

// Rodney Turf Pro Railway & Vercel deployment configuration
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
